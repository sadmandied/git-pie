/**
 * GitCity 3D — GitHub REST API Service & Tree Parser
 */

export const LANGUAGE_PALETTE = {
  javascript: { name: 'JavaScript', color: '#f7df1e', emissive: '#bda70b' },
  typescript: { name: 'TypeScript', color: '#3178c6', emissive: '#1f538e' },
  java:       { name: 'Java',       color: '#b07219', emissive: '#ff9800' },
  python:     { name: 'Python',     color: '#3572A5', emissive: '#00d2ff' },
  html:       { name: 'HTML',       color: '#e34c26', emissive: '#ff5722' },
  css:        { name: 'CSS',        color: '#563d7c', emissive: '#a855f7' },
  scss:       { name: 'SCSS',       color: '#c6538c', emissive: '#ec4899' },
  vue:        { name: 'Vue',        color: '#41b883', emissive: '#10b981' },
  json:       { name: 'JSON',       color: '#cbcb41', emissive: '#858585' },
  markdown:   { name: 'Markdown',   color: '#0891b2', emissive: '#06b6d4' },
  rust:       { name: 'Rust',       color: '#dea584', emissive: '#f97316' },
  go:         { name: 'Go',         color: '#00ADD8', emissive: '#38bdf8' },
  c:          { name: 'C',          color: '#555555', emissive: '#94a3b8' },
  cpp:        { name: 'C++',        color: '#f34b7d', emissive: '#f43f5e' },
  csharp:     { name: 'C#',         color: '#178600', emissive: '#22c55e' },
  php:        { name: 'PHP',        color: '#4F5D95', emissive: '#6366f1' },
  ruby:       { name: 'Ruby',       color: '#701516', emissive: '#ef4444' },
  sql:        { name: 'SQL',        color: '#e38c00', emissive: '#fbbf24' },
  shell:      { name: 'Shell',      color: '#89e051', emissive: '#84cc16' },
  yaml:       { name: 'YAML',       color: '#cb171e', emissive: '#f43f5e' },
  docker:     { name: 'Dockerfile', color: '#384d54', emissive: '#0284c7' },
  other:      { name: 'Other',      color: '#64748b', emissive: '#475569' }
};

const EXTENSION_MAP = {
  js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
  ts: 'typescript', tsx: 'typescript',
  java: 'java',
  py: 'python', pyw: 'python',
  html: 'html', htm: 'html',
  css: 'css', scss: 'scss', sass: 'scss', less: 'scss',
  vue: 'vue',
  json: 'json',
  md: 'markdown', markdown: 'markdown', mdown: 'markdown',
  rs: 'rust',
  go: 'go',
  c: 'c', h: 'c',
  cpp: 'cpp', hpp: 'cpp', cc: 'cpp', cxx: 'cpp',
  cs: 'csharp',
  php: 'php',
  rb: 'ruby',
  sql: 'sql',
  sh: 'shell', bash: 'shell', zsh: 'shell',
  yml: 'yaml', yaml: 'yaml'
};

export function detectLanguage(filename) {
  const lower = filename.toLowerCase();
  if (lower === 'dockerfile') return LANGUAGE_PALETTE.docker;
  const parts = lower.split('.');
  if (parts.length > 1) {
    const ext = parts.pop();
    const langKey = EXTENSION_MAP[ext];
    if (langKey && LANGUAGE_PALETTE[langKey]) {
      return LANGUAGE_PALETTE[langKey];
    }
  }
  return LANGUAGE_PALETTE.other;
}

export class GitHubService {
  constructor() {
    this.token = localStorage.getItem('gitcity_token') || '';
  }

  setToken(token) {
    this.token = token.trim();
    if (this.token) {
      localStorage.setItem('gitcity_token', this.token);
    } else {
      localStorage.removeItem('gitcity_token');
    }
  }

  getHeaders() {
    const headers = {
      'Accept': 'application/vnd.github.v3+json'
    };
    if (this.token) {
      headers['Authorization'] = `token ${this.token}`;
    }
    return headers;
  }

  async fetchRepository(repoSlug) {
    const cleanSlug = repoSlug.replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
    
    // Check if user requested a preset that we can supply immediately or if rate-limited
    try {
      // 1. Fetch repo metadata (default branch)
      const repoRes = await fetch(`https://api.github.com/repos/${cleanSlug}`, {
        headers: this.getHeaders()
      });

      if (!repoRes.ok) {
        if (repoRes.status === 403 || repoRes.status === 429) {
          console.warn('GitHub API rate limit encountered. Falling back to offline dataset if preset available.');
          return this.getFallbackData(cleanSlug, true);
        }
        throw new Error(`Repository error: HTTP ${repoRes.status}`);
      }

      const repoData = await repoRes.json();
      const defaultBranch = repoData.default_branch || 'main';

      // 2. Fetch full tree recursively
      const treeRes = await fetch(`https://api.github.com/repos/${cleanSlug}/git/trees/${defaultBranch}?recursive=1`, {
        headers: this.getHeaders()
      });

      if (!treeRes.ok) {
        throw new Error(`Tree fetch failed: HTTP ${treeRes.status}`);
      }

      const treeData = await treeRes.json();

      // 3. Fetch recent commits for the time machine
      let commits = [];
      try {
        const commitsRes = await fetch(`https://api.github.com/repos/${cleanSlug}/commits?per_page=30`, {
          headers: this.getHeaders()
        });
        if (commitsRes.ok) {
          commits = await commitsRes.json();
        }
      } catch (e) {
        console.warn('Could not fetch commits:', e);
      }

      return this.processTreeData(cleanSlug, repoData, treeData.tree, commits);
    } catch (err) {
      console.warn('Online fetch failed:', err.message, '- attempting preset fallback');
      const fallback = this.getFallbackData(cleanSlug, false);
      if (fallback) return fallback;
      throw err;
    }
  }

  processTreeData(repoSlug, repoMeta, rawTree, commits = []) {
    const files = [];
    const directories = new Set();
    const languageCounts = {};
    let totalSize = 0;

    for (const item of rawTree) {
      if (item.type === 'blob') {
        const parts = item.path.split('/');
        const filename = parts.pop();
        const district = parts.length > 0 ? parts.join('/') : 'root';
        if (parts.length > 0) directories.add(district);

        const lang = detectLanguage(filename);
        languageCounts[lang.name] = (languageCounts[lang.name] || 0) + 1;

        const size = item.size || Math.floor(Math.random() * 8000 + 400);
        totalSize += size;

        files.push({
          path: item.path,
          filename: filename,
          district: district,
          size: size,
          loc: Math.max(12, Math.round(size / 38)), // ~38 bytes per line approx
          language: lang,
          sha: item.sha,
          url: `https://github.com/${repoSlug}/blob/${repoMeta.default_branch || 'main'}/${item.path}`
        });
      } else if (item.type === 'tree') {
        directories.add(item.path);
      }
    }

    // Determine dominant language
    let dominantLang = 'None';
    let maxCount = 0;
    for (const [lang, count] of Object.entries(languageCounts)) {
      if (count > maxCount) {
        maxCount = count;
        dominantLang = lang;
      }
    }

    // Process commits for timeline
    const timelineCommits = (commits && commits.length > 0)
      ? commits.map(c => ({
          sha: c.sha ? c.sha.substring(0, 7) : 'head',
          date: c.commit?.author?.date || new Date().toISOString(),
          message: c.commit?.message?.split('\n')[0] || 'Update repository',
          author: c.commit?.author?.name || 'Developer'
        })).reverse()
      : this.generateSyntheticCommits(repoSlug);

    return {
      repoSlug,
      description: repoMeta?.description || 'Metropolis visualized in 3D',
      defaultBranch: repoMeta?.default_branch || 'main',
      files,
      districts: Array.from(directories),
      dominantLanguage: dominantLang,
      languageDistribution: languageCounts,
      totalFiles: files.length,
      totalSizeKB: Math.round(totalSize / 1024),
      commits: timelineCommits
    };
  }

  generateSyntheticCommits(repoSlug) {
    const dates = [
      '2026-01-10', '2026-02-14', '2026-03-22', '2026-05-18', '2026-07-04',
      '2026-08-15', '2026-09-01', '2026-10-10', '2026-10-17'
    ];
    return dates.map((d, i) => ({
      sha: `c${(i + 1) * 111111}`,
      date: d,
      message: i === 0 ? 'Initial architecture setup' : `Sprint milestone #${i + 1} optimization and features`,
      author: repoSlug.split('/')[0] || 'Lead Architect'
    }));
  }

  getFallbackData(requestedSlug, wasRateLimited = false) {
    // Built-in presets for offline or instant showcase:
    if (requestedSlug.toLowerCase().includes('coworking') || requestedSlug.toLowerCase().includes('sadmandied')) {
      return this.getCoworkingSpaceDataset();
    }
    if (requestedSlug.toLowerCase().includes('express')) {
      return this.getExpressDataset();
    }
    // Default fallback to CoworkingSpaceBookingSystem
    return this.getCoworkingSpaceDataset(wasRateLimited);
  }

  getCoworkingSpaceDataset(rateLimited = false) {
    const rawFiles = [
      // Backend - Java Controllers
      { path: 'src/main/java/com/coworking/Application.java', size: 1420 },
      { path: 'src/main/java/com/coworking/config/SecurityConfig.java', size: 4890 },
      { path: 'src/main/java/com/coworking/config/CorsConfig.java', size: 1280 },
      { path: 'src/main/java/com/coworking/config/DatabaseConfig.java', size: 3120 },
      { path: 'src/main/java/com/coworking/controller/AuthController.java', size: 6850 },
      { path: 'src/main/java/com/coworking/controller/BookingController.java', size: 12400 },
      { path: 'src/main/java/com/coworking/controller/DeskController.java', size: 7600 },
      { path: 'src/main/java/com/coworking/controller/PaymentController.java', size: 9800 },
      { path: 'src/main/java/com/coworking/controller/UserController.java', size: 5400 },
      // Models
      { path: 'src/main/java/com/coworking/model/User.java', size: 4200 },
      { path: 'src/main/java/com/coworking/model/Desk.java', size: 3800 },
      { path: 'src/main/java/com/coworking/model/Booking.java', size: 5100 },
      { path: 'src/main/java/com/coworking/model/Invoice.java', size: 4100 },
      { path: 'src/main/java/com/coworking/model/Room.java', size: 3600 },
      // Services
      { path: 'src/main/java/com/coworking/service/BookingService.java', size: 14800 },
      { path: 'src/main/java/com/coworking/service/PaymentService.java', size: 11200 },
      { path: 'src/main/java/com/coworking/service/NotificationService.java', size: 6300 },
      { path: 'src/main/java/com/coworking/service/AnalyticsService.java', size: 8400 },
      // Repository
      { path: 'src/main/java/com/coworking/repository/UserRepository.java', size: 2900 },
      { path: 'src/main/java/com/coworking/repository/DeskRepository.java', size: 3200 },
      { path: 'src/main/java/com/coworking/repository/BookingRepository.java', size: 4900 },
      // Frontend Vue
      { path: 'frontend/src/main.js', size: 1980 },
      { path: 'frontend/src/App.vue', size: 3840 },
      { path: 'frontend/src/views/DashboardView.vue', size: 12800 },
      { path: 'frontend/src/views/FloorPlanView.vue', size: 18500 },
      { path: 'frontend/src/views/BookingView.vue', size: 14200 },
      { path: 'frontend/src/views/LoginView.vue', size: 6800 },
      { path: 'frontend/src/components/DeskCard.vue', size: 5400 },
      { path: 'frontend/src/components/CalendarPicker.vue', size: 8900 },
      { path: 'frontend/src/components/PaymentModal.vue', size: 7600 },
      { path: 'frontend/src/components/Navbar.vue', size: 4100 },
      { path: 'frontend/src/router/index.js', size: 3200 },
      { path: 'frontend/src/store/userStore.js', size: 4900 },
      { path: 'frontend/src/store/bookingStore.js', size: 7100 },
      { path: 'frontend/src/styles/main.css', size: 9800 },
      { path: 'frontend/src/styles/cyberpunk-theme.css', size: 14500 },
      // Database & Config
      { path: 'database/schema.sql', size: 12000 },
      { path: 'database/seed_desks.sql', size: 6400 },
      { path: 'database/migrations/V1__init.sql', size: 8900 },
      { path: 'pom.xml', size: 7800 },
      { path: 'docker-compose.yml', size: 2100 },
      { path: 'Dockerfile', size: 1800 },
      { path: 'README.md', size: 8900 }
    ];

    const rawTree = rawFiles.map(f => ({ path: f.path, type: 'blob', size: f.size }));
    const meta = {
      description: 'Full-stack enterprise smart coworking & desk reservation ecosystem with interactive floor maps',
      default_branch: 'main'
    };

    const result = this.processTreeData('sadmandied/CoworkingSpaceBookingSystem', meta, rawTree);
    if (rateLimited) {
      result.notice = 'GitHub API rate limit reached. Displaying pre-cached neural metropolis data.';
    }
    return result;
  }

  getExpressDataset() {
    const rawFiles = [
      { path: 'index.js', size: 3200 },
      { path: 'lib/express.js', size: 5400 },
      { path: 'lib/application.js', size: 18500 },
      { path: 'lib/request.js', size: 14200 },
      { path: 'lib/response.js', size: 24500 },
      { path: 'lib/router/index.js', size: 22000 },
      { path: 'lib/router/route.js', size: 8900 },
      { path: 'lib/router/layer.js', size: 4800 },
      { path: 'lib/middleware/init.js', size: 1900 },
      { path: 'lib/middleware/query.js', size: 2400 },
      { path: 'lib/view.js', size: 7800 },
      { path: 'lib/utils.js', size: 6200 },
      { path: 'test/app.test.js', size: 9400 },
      { path: 'test/res.test.js', size: 11200 },
      { path: 'test/req.test.js', size: 8900 },
      { path: 'package.json', size: 2400 },
      { path: 'Readme.md', size: 7100 }
    ];
    const rawTree = rawFiles.map(f => ({ path: f.path, type: 'blob', size: f.size }));
    return this.processTreeData('expressjs/express', { description: 'Fast, unopinionated, minimalist web framework for node.', default_branch: 'master' }, rawTree);
  }
}

export const gitHubService = new GitHubService();
