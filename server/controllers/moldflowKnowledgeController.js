import fs from 'fs-extra';
import { MOLDFLOW_KNOWLEDGE_CONFIG_FILE } from '../config/index.js';
import { readJsonWithDefault } from '../utils/helpers.js';

const DEFAULT_MOLDFLOW_KNOWLEDGE_CONFIG = {
  cards: [
    {
      id: 'default-card',
      title: '模流知识库',
      url: '',
      description: '在这里集中进入外部模流分析知识站点。',
    },
  ],
}

function makeCardId(index = 0) {
  return `card-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`
}

function sanitizeConfig(input) {
  const raw = input && typeof input === 'object' ? input : {}
  const rawCards = Array.isArray(raw.cards) ? raw.cards : null

  if (rawCards && rawCards.length > 0) {
    return {
      cards: rawCards.map((item, index) => {
        const card = item && typeof item === 'object' ? item : {}
        return {
          id: String(card.id || makeCardId(index)).trim(),
          title: String(card.title || '').trim().slice(0, 80),
          url: String(card.url || '').trim().slice(0, 1000),
          description: String(card.description || '').trim().slice(0, 500),
        }
      }),
    }
  }

  return {
    cards: [
      {
        id: String(raw.id || 'default-card').trim(),
        title: String(raw.title || '').trim().slice(0, 80),
        url: String(raw.url || '').trim().slice(0, 1000),
        description: String(raw.description || '').trim().slice(0, 500),
      },
    ],
  }
}

function validateConfig(config) {
  if (!Array.isArray(config.cards) || config.cards.length === 0) {
    return '请至少保留一张卡片'
  }

  for (const card of config.cards) {
    if (!card.title) {
      return '请输入网站名称'
    }

    if (card.url) {
      try {
        const parsed = new URL(card.url)
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          return '网站链接必须以 http:// 或 https:// 开头'
        }
      } catch {
        return '请输入有效的网站链接'
      }
    }
  }

  return ''
}

async function getConfigFile() {
  const config = await readJsonWithDefault(
    MOLDFLOW_KNOWLEDGE_CONFIG_FILE,
    DEFAULT_MOLDFLOW_KNOWLEDGE_CONFIG,
  );
  return sanitizeConfig(config);
}

export const getMoldflowKnowledgeConfig = async (req, res) => {
  try {
    const config = await getConfigFile();
    res.json(config);
  } catch {
    res.status(500).json({ error: '获取模流知识库配置失败' });
  }
};

export const updateMoldflowKnowledgeConfig = async (req, res) => {
  try {
    const config = sanitizeConfig(req.body);
    const error = validateConfig(config);
    if (error) {
      return res.status(400).json({ error });
    }

    await fs.writeJson(MOLDFLOW_KNOWLEDGE_CONFIG_FILE, config, { spaces: 2 });
    res.json(config);
  } catch {
    res.status(500).json({ error: '保存模流知识库配置失败' });
  }
};
