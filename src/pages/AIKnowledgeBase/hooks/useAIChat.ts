
import { useState, useEffect, useCallback, useRef } from 'react'
import OpenAI from 'openai'
import { DEFAULT_SETTINGS } from '../types'
import type { ChatSession, Message, AISettings } from '../types'

export const useAIChat = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [settings, setSettings] = useState<AISettings>(() => {
    try {
      const saved = localStorage.getItem('ai_settings')
      if (saved) {
        const parsed = JSON.parse(saved)
        // Check if it's the new format
        if (parsed.currentProviderId && parsed.providers) {
          return parsed
        }
        // Migration from old format
        return DEFAULT_SETTINGS
      }
      return DEFAULT_SETTINGS
    } catch {
      return DEFAULT_SETTINGS
    }
  })
  const [loading, setLoading] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Load sessions from server on mount
  useEffect(() => {
    fetch('http://localhost:3001/api/ai/chats')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setSessions(data)
        }
      })
      .catch(e => console.error('Failed to load sessions from server', e))
  }, [])

  // Save session to server helper
  const saveSessionToServer = async (session: ChatSession) => {
    try {
      await fetch('http://localhost:3001/api/ai/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(session)
      })
    } catch (e) {
      console.error('Failed to save session to server', e)
    }
  }

  // Save settings when they change
  useEffect(() => {
    localStorage.setItem('ai_settings', JSON.stringify(settings))
  }, [settings])

  const createNewSession = useCallback(() => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: '新对话',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    setSessions(prev => [newSession, ...prev])
    setCurrentSessionId(newSession.id)
    saveSessionToServer(newSession)
    return newSession.id
  }, [])

  const deleteSession = useCallback((id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id))
    if (currentSessionId === id) {
      setCurrentSessionId(null)
    }
    // Delete from server
    fetch(`http://localhost:3001/api/ai/chats/${id}`, { method: 'DELETE' })
      .catch(e => console.error('Failed to delete session', e))
  }, [currentSessionId])

  const updateSettings = useCallback((newSettings: Partial<AISettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }, [])

  const sendMessage = useCallback(async (content: string, options?: { useBailian?: boolean }) => {
    if (!content.trim()) return

    let sessionId = currentSessionId
    if (!sessionId) {
      sessionId = createNewSession()
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now(),
    }

    // Update state with user message
    // Note: We need to use functional update to get latest sessions
    let currentSession: ChatSession | undefined;
    
    setSessions(prev => {
        const updated = prev.map(session => {
          if (session.id === sessionId) {
            const updatedSession = {
              ...session,
              messages: [...session.messages, userMessage],
              updatedAt: Date.now(),
              title: session.messages.length === 0 ? content.slice(0, 20) : session.title
            }
            currentSession = updatedSession;
            saveSessionToServer(updatedSession)
            return updatedSession
          }
          return session
        });
        return updated;
    });

    setLoading(true)
    abortControllerRef.current = new AbortController()

    try {
      // Get current session messages to send to API
      // Since setState is async, we can't rely on 'sessions' state immediately.
      // But we captured 'currentSession' in the functional update above? No, that's side effect in render phase (bad practice).
      // Better: Re-find it or use the constructed object.
      // But we can't easily get it out of setState callback.
      // So let's just find it in 'sessions' and append userMessage manually for API call.
      const sessionForApi = sessions.find(s => s.id === sessionId);
      const messagesForApi = sessionForApi 
        ? [...sessionForApi.messages, userMessage] 
        : [userMessage];

      const apiMessages = messagesForApi.map(m => ({
        role: m.role,
        content: m.content
      }))

      let response;
      
      if (options?.useBailian) {
          // Use Bailian Knowledge Base
          const currentProvider = settings.providers[settings.currentProviderId] || settings.providers['deepseek'];
          
          response = await fetch('http://localhost:3001/api/bailian/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: apiMessages,
                useExternalModel: true, // Always prefer "Hybrid RAG" if KB ID is set
                providerConfig: {
                    apiKey: currentProvider.apiKey,
                    baseUrl: currentProvider.baseUrl.replace(/\/+$/, ''),
                    model: currentProvider.model,
                    temperature: currentProvider.temperature,
                }
            }),
            signal: abortControllerRef.current.signal,
          });
      } else {
          // Use Standard Proxy
          const currentProvider = settings.providers[settings.currentProviderId] || settings.providers['deepseek']
          response = await fetch('http://localhost:3001/api/ai/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              apiKey: currentProvider.apiKey,
              baseUrl: currentProvider.baseUrl.replace(/\/+$/, ''),
              model: currentProvider.model,
              messages: apiMessages,
              temperature: currentProvider.temperature,
            }),
            signal: abortControllerRef.current.signal,
          });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server Error: ${response.status}`);
      }
      
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      const assistantMessageId = crypto.randomUUID()
      let fullContent = ''
      
      // If using Bailian, show "Thinking..." or "Retrieving..." first?
      if (options?.useBailian) {
          fullContent = '正在检索知识库... \n\n';
      }

      // Initialize assistant message placeholder
      setSessions(prev => prev.map(s => {
        if (s.id === sessionId) {
          return {
            ...s,
            messages: [...s.messages, {
              id: assistantMessageId,
              role: 'assistant',
              content: '', // Start empty
              timestamp: Date.now()
            }]
          }
        }
        return s
      }))

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; 

        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line.trim() === 'data: [DONE]') continue;
          
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              const delta = data.content || (data.choices && data.choices[0]?.delta?.content) || '';
              if (delta) {
                  // If it's the first chunk and we showed "Retrieving...", replace it
                  if (fullContent.startsWith('正在检索知识库... \n\n') && delta) {
                      fullContent = delta;
                  } else {
                      fullContent += delta;
                  }
                  
                  // Update UI with streaming content
                  setSessions(prev => prev.map(s => {
                    if (s.id === sessionId) {
                      const newMessages = [...s.messages]
                      const msgIndex = newMessages.findIndex(m => m.id === assistantMessageId)
                      if (msgIndex !== -1) {
                        newMessages[msgIndex] = {
                          ...newMessages[msgIndex],
                          content: fullContent
                        }
                        return { ...s, messages: newMessages }
                      }
                    }
                    return s
                  }))
              }
              if (data.error) throw new Error(data.error);
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
      
      // Save final state to server
      // Note: We need to get the latest state or reconstruct it carefully
      // The session in 'sessions' state might be stale in this closure, BUT we updated it via setSessions functional updates.
      // To save to server, we need the final object.
      // We can reconstruct it from what we know:
      // old messages + userMessage + assistantMessage(fullContent)
      
      // Fetch latest from state? No, that's hard in async function.
      // Better: Construct the new session object here.
      // We know 'sessionForApi' (base) + userMessage + assistantMessage
      
      const finalMessages = [...(sessionForApi?.messages || []), userMessage, {
            id: assistantMessageId,
            role: 'assistant' as const,
            content: fullContent,
            timestamp: Date.now()
      }];
      
      const finalSession = {
            ...(sessionForApi || { id: sessionId, title: 'New Chat', createdAt: Date.now() }),
            messages: finalMessages,
            updatedAt: Date.now(),
            title: (sessionForApi?.title && sessionForApi.title !== '新对话') ? sessionForApi.title : (finalMessages[0]?.content.slice(0, 20) || 'New Chat')
      } as ChatSession; // Cast needed as we might miss some fields if sessionForApi is undefined (but it shouldn't be if logic is correct)

      saveSessionToServer(finalSession)

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request aborted')
      } else {
        console.error('AI Error:', error)
        let errorMessage = error.message || '未知错误'
        
        // Enhance connection error message
        if (errorMessage.includes('Connection error') || errorMessage.includes('Failed to fetch')) {
          errorMessage = `连接失败。请检查：
1. 后端服务是否启动 (localhost:3001)
2. API 配置是否正确`
        }

        // Add error message to chat
        setSessions(prev => prev.map(s => {
          if (s.id === sessionId) {
            return {
              ...s,
              messages: [...s.messages, {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: `Error: ${errorMessage}`,
                timestamp: Date.now()
              }]
            }
          }
          return s
        }))
      }
    } finally {
      setLoading(false)
      abortControllerRef.current = null
    }
  }, [currentSessionId, createNewSession, sessions, settings])

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setLoading(false)
    }
  }, [])

  const clearHistory = useCallback(async () => {
    if (window.confirm('确定要清空所有历史记录吗？')) {
      setSessions([])
      setCurrentSessionId(null)
      try {
        await fetch('http://localhost:3001/api/ai/chats', { method: 'DELETE' })
      } catch (e) {
        console.error('Failed to clear history', e)
      }
    }
  }, [])

  return {
    sessions,
    currentSessionId,
    setCurrentSessionId,
    settings,
    updateSettings,
    createNewSession,
    deleteSession,
    sendMessage,
    loading,
    stopGeneration,
    clearHistory
  }
}
