#!/bin/bash
cp /root/YAZHUGONGJU/deploy/yazhu.caomaowu.lol.conf /etc/nginx/sites-available/yazhu.caomaowu.lol
ln -sf /etc/nginx/sites-available/yazhu.caomaowu.lol /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
