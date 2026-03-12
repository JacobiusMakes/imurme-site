#!/usr/bin/env node
/**
 * Export site-data.json from analytics.json for the static IMURME website.
 * Run from the main project directory:
 *   node imurme-site/scripts/export-site-data.js
 */

const fs = require('fs');
const path = require('path');

const analyticsPath = path.join(__dirname, '../../RawMemes/analytics.json');
const outputPath = path.join(__dirname, '../data/site-data.json');

if (!fs.existsSync(analyticsPath)) {
  console.error('analytics.json not found at', analyticsPath);
  process.exit(1);
}

const analytics = JSON.parse(fs.readFileSync(analyticsPath, 'utf8'));
const posts = Object.values(analytics.posts || {}).filter(p => !p.flagged && p.metrics?.latest);

// Sort by views desc
posts.sort((a, b) => (b.metrics.latest.views || 0) - (a.metrics.latest.views || 0));

const totalViews = posts.reduce((s, p) => s + (p.metrics.latest.views || 0), 0);
const totalEng = posts.reduce((s, p) => {
  const m = p.metrics.latest;
  return s + (m.likes || 0) + (m.comments || 0) + (m.shares || 0) + (m.saved || 0);
}, 0);
const avgEng = totalViews > 0 ? ((totalEng / totalViews) * 100).toFixed(1) + '%' : '0%';

const siteData = {
  meta: {
    generatedAt: new Date().toISOString(),
    totalReels: posts.length,
    totalViews,
    avgEngagement: avgEng,
    topReelViews: posts[0]?.metrics.latest.views || 0,
  },
  reels: posts.map(p => ({
    id: p.compId,
    igUrl: p.igUrl || '',
    thumbnailUrl: p.thumbnailUrl || '',
    postedAt: p.postedAt ? p.postedAt.slice(0, 10) : '',
    type: p.compilation?.type || 'unknown',
    song: (p.compilation?.song || '').replace(/-IGAUDIO$/i, '').replace(/([a-z])([A-Z])/g, '$1 $2'),
    views: p.metrics.latest.views || 0,
    likes: p.metrics.latest.likes || 0,
    shares: p.metrics.latest.shares || 0,
  })),
  songs: [...new Set(posts.map(p => (p.compilation?.song || '').replace(/-IGAUDIO$/i, '').replace(/([a-z])([A-Z])/g, '$1 $2')))].filter(Boolean),
  about: {
    tagline: 'curated chaos set to music',
    description: 'meme compilations that hit different',
  },
  links: {
    instagram: 'https://instagram.com/imurme',
  },
};

fs.writeFileSync(outputPath, JSON.stringify(siteData, null, 2));
console.log(`Exported ${posts.length} reels to ${outputPath}`);
console.log(`Total views: ${totalViews.toLocaleString()}`);
