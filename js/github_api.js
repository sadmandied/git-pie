/**
 * GitPie — GitHub REST API Service & Cartoon Recipe Data
 */

export const LANGUAGE_PALETTE = {
  java:       { name: 'Java / JSP',   flavor: 'Cherry Tart',        color: '#d63031', darkColor: '#a71d2a' },
  javascript: { name: 'JavaScript',   flavor: 'Lemon Meringue',     color: '#fbc531', darkColor: '#c29712' },
  typescript: { name: 'TypeScript',   flavor: 'Blueberry Pie',      color: '#0984e3', darkColor: '#075ca0' },
  python:     { name: 'Python',       flavor: 'Key Lime Pie',       color: '#00b894', darkColor: '#00876c' },
  sql:        { name: 'SQL',          flavor: 'Butterscotch Crumb', color: '#e58e26', darkColor: '#b06713' },
  html:       { name: 'HTML',         flavor: 'Pumpkin Cobbler',    color: '#e17055', darkColor: '#b94e36' },
  css:        { name: 'CSS',          flavor: 'Plum Custard',       color: '#6c5ce7', darkColor: '#4d3ec2' },
  scss:       { name: 'SCSS',         flavor: 'Strawberry Glaze',   color: '#e84393', darkColor: '#b8276f' },
  vue:        { name: 'Vue',          flavor: 'Pistachio Pastry',   color: '#20bf6b', darkColor: '#148f4e' },
  xml:        { name: 'XML / Config', flavor: 'Sugar Wafers',       color: '#a29bfe', darkColor: '#6c5ce7' },
  json:       { name: 'JSON',         flavor: 'Sweet Icing',        color: '#fd79a8', darkColor: '#d63031' },
  markdown:   { name: 'Markdown',     flavor: 'Vanilla Cookie',     color: '#74b9ff', darkColor: '#4b8ec9' },
  rust:       { name: 'Rust',         flavor: 'Cinnamon Crisp',     color: '#e67e22', darkColor: '#b35d10' },
  go:         { name: 'Go',           flavor: 'Mint Sorbet',        color: '#00cec9', darkColor: '#009794' },
  c:          { name: 'C',            flavor: 'Blackberry Tart',    color: '#34495e', darkColor: '#1f2d3a' },
  cpp:        { name: 'C++',          flavor: 'Raspberry Danish',   color: '#e84393', darkColor: '#cf4675' },
  csharp:     { name: 'C#',           flavor: 'Apple Turn-over',    color: '#2ed573', darkColor: '#1d9e52' },
  yaml:       { name: 'YAML / Props', flavor: 'Caramel Macaron',    color: '#f39c12', darkColor: '#be7406' },
  shell:      { name: 'Shell Script', flavor: 'Gingerbread Crust',  color: '#8395a7', darkColor: '#576574' },
  docker:     { name: 'Dockerfile',   flavor: 'Frosted Cupcake',    color: '#4b7bec', darkColor: '#2b56b8' },
  other:      { name: 'Other Code',   flavor: 'Mystery Doughnut',   color: '#a5b1c2', darkColor: '#778ca3' }
};

const BINARY_EXTENSIONS = new Set([
  'jar', 'war', 'ear', 'zip', 'tar', 'gz', '7z', 'rar',
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'webp', 'bmp', 'tiff',
  'mp3', 'wav', 'ogg', 'mp4', 'mov', 'webm', 'avi',
  'class', 'exe', 'dll', 'so', 'dylib', 'bin', 'pdf',
  'woff', 'woff2', 'ttf', 'eot', 'otf', 'mf'
]);

const EXTENSION_MAP = {
  // Java & JSP
  java: 'java', jsp: 'java', jspf: 'java', jspx: 'java',
  // JavaScript & TypeScript
  js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
  ts: 'typescript', tsx: 'typescript',
  // Python
  py: 'python', pyw: 'python',
  // Database SQL
  sql: 'sql', ddl: 'sql', dml: 'sql',
  // Web Markup & Styling
  html: 'html', htm: 'html',
  css: 'css', scss: 'scss', sass: 'scss', less: 'scss',
  vue: 'vue',
  // XML & Config
  xml: 'xml', xsd: 'xml', wsdl: 'xml', tld: 'xml', pom: 'xml',
  properties: 'yaml', env: 'yaml', cfg: 'yaml', ini: 'yaml',
  json: 'json',
  md: 'markdown', markdown: 'markdown', mdown: 'markdown',
  // Systems
  rs: 'rust',
  go: 'go',
  c: 'c', h: 'c',
  cpp: 'cpp', hpp: 'cpp', cc: 'cpp', cxx: 'cpp',
  cs: 'csharp',
  sh: 'shell', bash: 'shell', zsh: 'shell',
  yml: 'yaml', yaml: 'yaml'
};

export function isBinaryFile(filename) {
  const parts = filename.toLowerCase().split('.');
  if (parts.length > 1) {
    const ext = parts.pop();
    if (BINARY_EXTENSIONS.has(ext)) return true;
  }
  return false;
}

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
    const headers = { 'Accept': 'application/vnd.github.v3+json' };
    if (this.token) {
      headers['Authorization'] = `token ${this.token}`;
    }
    return headers;
  }

  async fetchUserRepositories(username = 'sadmandied') {
    try {
      const res = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`, {
        headers: this.getHeaders()
      });
      if (res.ok) {
        const repos = await res.json();
        return repos.map(r => ({
          name: r.name,
          fullName: r.full_name,
          description: r.description || '',
          language: r.language || 'Code'
        }));
      }
    } catch (e) {
      console.warn('Could not fetch user repos from GitHub API:', e);
    }

    // Default known repositories for sadmandied
    return [
      { name: 'CoworkingSpaceBookingSystem', fullName: 'sadmandied/CoworkingSpaceBookingSystem', language: 'Java / JSP' },
      { name: 'BloodDonationManagement', fullName: 'sadmandied/BloodDonationManagement', language: 'Java / SQL' },
      { name: 'whatsapp-outreach-engine', fullName: 'sadmandied/whatsapp-outreach-engine', language: 'Python' },
      { name: 'dead-noodles', fullName: 'sadmandied/dead-noodles', language: 'JavaScript' },
      { name: 'terminal-dungeon', fullName: 'sadmandied/terminal-dungeon', language: 'JavaScript' },
      { name: 'Sadman.Portfolio', fullName: 'sadmandied/Sadman.Portfolio', language: 'HTML / CSS' },
      { name: 'git-pie', fullName: 'sadmandied/git-pie', language: 'JavaScript / HTML5' }
    ];
  }

  async fetchRepository(repoSlug) {
    const cleanSlug = repoSlug.replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');

    try {
      const repoRes = await fetch(`https://api.github.com/repos/${cleanSlug}`, {
        headers: this.getHeaders()
      });

      if (!repoRes.ok) {
        if (repoRes.status === 403 || repoRes.status === 429) {
          console.warn('API rate limit. Falling back to preset.');
          return this.getFallbackData(cleanSlug, true);
        }
        throw new Error(`Repository error: HTTP ${repoRes.status}`);
      }

      const repoData = await repoRes.json();
      const defaultBranch = repoData.default_branch || 'main';

      const treeRes = await fetch(`https://api.github.com/repos/${cleanSlug}/git/trees/${defaultBranch}?recursive=1`, {
        headers: this.getHeaders()
      });

      if (!treeRes.ok) {
        throw new Error(`Tree fetch failed: HTTP ${treeRes.status}`);
      }

      const treeData = await treeRes.json();

      let commits = [];
      try {
        const commitsRes = await fetch(`https://api.github.com/repos/${cleanSlug}/commits?per_page=25`, {
          headers: this.getHeaders()
        });
        if (commitsRes.ok) commits = await commitsRes.json();
      } catch (e) {}

      return this.processTreeData(cleanSlug, repoData, treeData.tree, commits);
    } catch (err) {
      console.warn('Online fetch failed:', err.message, '- falling back to preset');
      return this.getFallbackData(cleanSlug, false);
    }
  }

  processTreeData(repoSlug, repoMeta, rawTree, commits = []) {
    const files = [];
    const folders = new Set();
    const languageTotals = {};
    let totalBytes = 0;

    for (const item of rawTree) {
      if (item.type === 'blob') {
        const parts = item.path.split('/');
        const filename = parts.pop();

        // Skip binary assets (images, jars, zips, binaries) so they don't skew the LOC pie!
        if (isBinaryFile(filename)) {
          continue;
        }

        const folder = parts.length > 0 ? parts.join('/') : 'root';
        if (parts.length > 0) folders.add(folder);

        const lang = detectLanguage(filename);
        const size = item.size || Math.floor(Math.random() * 4000 + 300);
        // Realistic text lines of code: ~35 bytes per line, capped to avoid binary distortion
        const loc = Math.max(4, Math.round(Math.min(size, 80000) / 35));

        totalBytes += size;
        if (!languageTotals[lang.name]) {
          languageTotals[lang.name] = {
            lang: lang,
            bytes: 0,
            loc: 0,
            fileCount: 0,
            files: []
          };
        }
        languageTotals[lang.name].bytes += size;
        languageTotals[lang.name].loc += loc;
        languageTotals[lang.name].fileCount += 1;

        const fileObj = {
          path: item.path,
          filename: filename,
          folder: folder,
          size: size,
          loc: loc,
          language: lang,
          url: `https://github.com/${repoSlug}/blob/${repoMeta.default_branch || 'main'}/${item.path}`
        };

        languageTotals[lang.name].files.push(fileObj);
        files.push(fileObj);
      } else if (item.type === 'tree') {
        folders.add(item.path);
      }
    }

    // Sort slices by LOC descending
    const slices = Object.values(languageTotals).sort((a, b) => b.loc - a.loc);
    const totalLoc = slices.reduce((acc, s) => acc + s.loc, 0);

    // Compute angles for pie slices
    let currentAngle = -Math.PI / 2; // start at top (12 o'clock)
    slices.forEach(slice => {
      slice.percentage = totalLoc > 0 ? (slice.loc / totalLoc) : 0;
      slice.startAngle = currentAngle;
      slice.angle = slice.percentage * Math.PI * 2;
      slice.endAngle = currentAngle + slice.angle;
      currentAngle += slice.angle;
    });

    const parsedCommits = (commits && commits.length > 0)
      ? commits.map(c => ({
          sha: c.sha ? c.sha.substring(0, 7) : 'head',
          date: c.commit?.author?.date || new Date().toISOString(),
          message: c.commit?.message?.split('\n')[0] || 'Bake new ingredients',
          author: c.commit?.author?.name || 'Chef'
        })).reverse()
      : this.generateSyntheticCommits(repoSlug);

    return {
      repoSlug,
      description: repoMeta?.description || 'Freshly baked codebase pie',
      files,
      folders: Array.from(folders),
      slices,
      totalFiles: files.length,
      totalLoc,
      totalKB: Math.round(totalBytes / 1024),
      commits: parsedCommits
    };
  }

  generateSyntheticCommits(repoSlug) {
    const dates = ['Batch 1: Yeast & Flour', 'Batch 2: Add Sugar', 'Batch 3: Mix Batter', 'Batch 4: Into The Oven!', 'Fresh Out Of The Oven'];
    return dates.map((d, i) => ({
      sha: `pie#${i + 1}`,
      date: `193${i}-06-12`,
      message: d,
      author: repoSlug.split('/')[0] || 'Master Baker'
    }));
  }

  getFallbackData(requestedSlug, isRateLimited = false) {
    return this.getCoworkingSpaceDataset(isRateLimited);
  }

  getCoworkingSpaceDataset(isRateLimited = false) {
    const files = [
      // JavaServer Pages
      { path: 'web/addspace.jsp', size: 3400 },
      { path: 'web/admin_dashboard.jsp', size: 6800 },
      { path: 'web/book.jsp', size: 4500 },
      { path: 'web/connection.jsp', size: 1800 },
      { path: 'web/editspace.jsp', size: 3200 },
      { path: 'web/history.jsp', size: 4100 },
      { path: 'web/home.jsp', size: 5200 },
      { path: 'web/login.jsp', size: 3600 },
      { path: 'web/logout.jsp', size: 900 },
      { path: 'web/profile.jsp', size: 3800 },
      { path: 'web/receipt.jsp', size: 2900 },
      { path: 'web/register.jsp', size: 4200 },
      { path: 'web/spaces.jsp', size: 4800 },
      // SQL Database
      { path: 'db/01_schema.sql', size: 5400 },
      { path: 'db/02_seed.sql', size: 4200 },
      { path: 'db/03_reset.sql', size: 1200 },
      { path: 'schema.sql', size: 5400 },
      // CSS Styling
      { path: 'web/newcss.css', size: 6800 },
      // XML Configuration
      { path: 'build.xml', size: 3100 },
      { path: 'web/WEB-INF/web.xml', size: 1900 },
      { path: 'nbproject/project.xml', size: 2400 },
      { path: 'nbproject/project.properties', size: 1600 },
      { path: 'README.md', size: 2800 }
    ];
    const rawTree = files.map(f => ({ path: f.path, type: 'blob', size: f.size }));
    return this.processTreeData('sadmandied/CoworkingSpaceBookingSystem', { description: 'Smart Coworking & Desk Reservation Ecosystem' }, rawTree);
  }
}

export const gitHubService = new GitHubService();
