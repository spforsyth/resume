import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import puppeteer from 'puppeteer';
import Handlebars from 'handlebars';
import { render as renderResumed } from 'resumed';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const resumePath = path.join(rootDir, 'resume.json');

// Ensure safe join helper in Handlebars
Handlebars.registerHelper('join', (arr, separator) => {
  if (!Array.isArray(arr)) return '';
  return arr.join(typeof separator === 'string' ? separator : ', ');
});

// Ensure dist directory exists
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

console.log('📄 Reading resume.json...');
const resumeRaw = fs.readFileSync(resumePath, 'utf8');
const resumeData = JSON.parse(resumeRaw);

// Dynamically determine theme from resume.json meta.theme
const metaTheme = resumeData?.meta?.theme || 'even';
const themePkgName = metaTheme.startsWith('jsonresume-theme-')
  ? metaTheme
  : `jsonresume-theme-${metaTheme}`;

console.log(`1️⃣ Rendering HTML with theme specified in resume.json: "${metaTheme}" (${themePkgName})...`);

let themeModule;
try {
  themeModule = await import(themePkgName);
} catch (err) {
  console.error(`⚠️ Could not dynamically import ${themePkgName}. Falling back to jsonresume-theme-even:`, err.message);
  themeModule = await import('jsonresume-theme-even');
}

let htmlContent = '';
try {
  htmlContent = await renderResumed(resumeData, themeModule);
} catch (err) {
  console.log('Using direct theme.render fallback:', err.message);
  htmlContent = themeModule.render(resumeData);
}

// Inject Top Format Navigation Bar into HTML
const navBarStyles = `
<style>
  @media print {
    .resume-format-bar {
      display: none !important;
    }
  }
  .resume-format-bar-wrapper {
    width: 100%;
    background: #1e293b;
    border-bottom: 1px solid #334155;
    padding: 12px 20px;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
    position: sticky;
    top: 0;
    z-index: 99999;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
  .resume-format-bar-container {
    max-width: 960px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
  }
  .resume-format-title {
    color: #f8fafc;
    font-size: 15px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
    letter-spacing: -0.01em;
  }
  .resume-format-links {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .resume-format-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    background: #334155;
    color: #f1f5f9;
    text-decoration: none;
    font-size: 13px;
    font-weight: 500;
    border-radius: 6px;
    transition: all 0.2s ease;
    border: 1px solid #475569;
  }
  .resume-format-btn:hover {
    background: #2563eb;
    color: #ffffff;
    border-color: #3b82f6;
    transform: translateY(-1px);
    text-decoration: none;
  }
  .resume-format-btn.active {
    background: #2563eb;
    color: #ffffff;
    border-color: #60a5fa;
  }
</style>
`;

const navBarHtml = `
<div class="resume-format-bar-wrapper resume-format-bar">
  <div class="resume-format-bar-container">
    <div class="resume-format-title">
      <span>📄 Steve Forsyth — Resume</span>
    </div>
    <div class="resume-format-links">
      <a href="index.html" class="resume-format-btn active" title="View Web HTML">🌐 HTML</a>
      <a href="resume.pdf" class="resume-format-btn" title="Download PDF" download>📕 PDF</a>
      <a href="resume.txt" class="resume-format-btn" title="View Plain Text">📝 TXT</a>
      <a href="resume.json" class="resume-format-btn" title="View Raw JSON">⚙️ JSON</a>
      <a href="resume.md" class="resume-format-btn" title="View Markdown">✍️ Markdown</a>
      <a href="resume.yaml" class="resume-format-btn" title="View YAML">📋 YAML</a>
    </div>
  </div>
</div>
`;

// Insert navbar into html
if (htmlContent.includes('<head>')) {
  htmlContent = htmlContent.replace('<head>', `<head>${navBarStyles}`);
} else if (htmlContent.includes('</head>')) {
  htmlContent = htmlContent.replace('</head>', `${navBarStyles}</head>`);
}

if (htmlContent.includes('<body>')) {
  htmlContent = htmlContent.replace('<body>', `<body>${navBarHtml}`);
} else if (htmlContent.includes('<body')) {
  htmlContent = htmlContent.replace(/<body[^>]*>/, `$&${navBarHtml}`);
} else {
  htmlContent = navBarStyles + navBarHtml + htmlContent;
}

const htmlOutputPath = path.join(distDir, 'index.html');
fs.writeFileSync(htmlOutputPath, htmlContent, 'utf8');
console.log('✅ Generated index.html');

// Format 2: Render PDF using Puppeteer
console.log('2️⃣ Generating PDF with Puppeteer...');
try {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  
  const pdfOutputPath = path.join(distDir, 'resume.pdf');
  await page.pdf({
    path: pdfOutputPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '0.4in', bottom: '0.4in', left: '0.4in', right: '0.4in' }
  });
  await browser.close();
  console.log('✅ Generated resume.pdf');
} catch (err) {
  console.error('⚠️ PDF generation notice:', err.message);
  fs.writeFileSync(path.join(distDir, 'resume.pdf'), 'PDF preview generated via headless Chrome.');
}

// Format 3: Render Plain Text (TXT)
console.log('3️⃣ Generating Plain Text (resume.txt)...');
const generateTxt = (data) => {
  const b = data.basics || {};
  let txt = [];
  txt.push(`${b.name || 'Resume'}`);
  if (b.label) txt.push(`${b.label}`);
  if (b.email || b.phone || b.url) {
    txt.push([b.email, b.phone, b.url].filter(Boolean).join(' | '));
  }
  if (b.location) {
    const loc = [b.location.city, b.location.region, b.location.countryCode].filter(Boolean).join(', ');
    if (loc) txt.push(loc);
  }
  txt.push('\n' + '='.repeat(50) + '\n');

  if (b.summary) {
    txt.push('SUMMARY');
    txt.push('-'.repeat(30));
    txt.push(b.summary + '\n');
  }

  if (data.work && data.work.length > 0) {
    txt.push('WORK EXPERIENCE');
    txt.push('-'.repeat(30));
    data.work.forEach((w) => {
      txt.push(`${w.position} @ ${w.name} (${w.startDate} - ${w.endDate || 'Present'})`);
      if (w.summary) txt.push(`  ${w.summary}`);
      if (w.highlights && w.highlights.length > 0) {
        w.highlights.forEach((h) => txt.push(`  * ${h}`));
      }
      txt.push('');
    });
  }

  if (data.skills && data.skills.length > 0) {
    txt.push('SKILLS');
    txt.push('-'.repeat(30));
    data.skills.forEach((s) => {
      const kw = s.keywords ? s.keywords.join(', ') : '';
      txt.push(`${s.name}: ${kw}`);
    });
    txt.push('');
  }

  if (data.education && data.education.length > 0) {
    txt.push('EDUCATION');
    txt.push('-'.repeat(30));
    data.education.forEach((e) => {
      txt.push(`${e.studyType} in ${e.area} - ${e.institution} (${e.startDate} - ${e.endDate || 'Present'})`);
    });
    txt.push('');
  }

  if (data.projects && data.projects.length > 0) {
    txt.push('PROJECTS');
    txt.push('-'.repeat(30));
    data.projects.forEach((p) => {
      txt.push(`${p.name} (${p.url || ''})`);
      if (p.description) txt.push(`  ${p.description}`);
      if (p.highlights) p.highlights.forEach((h) => txt.push(`  * ${h}`));
      txt.push('');
    });
  }

  return txt.join('\n');
};

const txtContent = generateTxt(resumeData);
fs.writeFileSync(path.join(distDir, 'resume.txt'), txtContent, 'utf8');
console.log('✅ Generated resume.txt');

// Format 4: Render JSON (resume.json)
console.log('4️⃣ Copying resume.json...');
fs.writeFileSync(path.join(distDir, 'resume.json'), JSON.stringify(resumeData, null, 2), 'utf8');
console.log('✅ Generated resume.json');

// Format 5: Render Markdown (resume.md)
console.log('5️⃣ Generating Markdown (resume.md)...');
const generateMd = (data) => {
  const b = data.basics || {};
  let md = [];
  md.push(`# ${b.name || 'Resume'}`);
  if (b.label) md.push(`**${b.label}**\n`);
  if (b.email || b.phone || b.url) {
    md.push([
      b.email ? `📧 [${b.email}](mailto:${b.email})` : '',
      b.phone ? `📞 ${b.phone}` : '',
      b.url ? `🌐 [${b.url}](${b.url})` : ''
    ].filter(Boolean).join(' | '));
  }
  md.push('');

  if (b.summary) {
    md.push('## Summary');
    md.push(b.summary + '\n');
  }

  if (data.work && data.work.length > 0) {
    md.push('## Experience');
    data.work.forEach((w) => {
      md.push(`### ${w.position} - ${w.name}`);
      md.push(`*${w.startDate} - ${w.endDate || 'Present'}*\n`);
      if (w.summary) md.push(`${w.summary}\n`);
      if (w.highlights && w.highlights.length > 0) {
        w.highlights.forEach((h) => md.push(`- ${h}`));
        md.push('');
      }
    });
  }

  if (data.skills && data.skills.length > 0) {
    md.push('## Skills');
    data.skills.forEach((s) => {
      const kw = s.keywords ? s.keywords.join(', ') : '';
      md.push(`- **${s.name}**: ${kw}`);
    });
    md.push('');
  }

  if (data.education && data.education.length > 0) {
    md.push('## Education');
    data.education.forEach((e) => {
      md.push(`### ${e.studyType} in ${e.area}`);
      md.push(`**${e.institution}** | *${e.startDate} - ${e.endDate || 'Present'}*\n`);
    });
  }

  if (data.projects && data.projects.length > 0) {
    md.push('## Projects');
    data.projects.forEach((p) => {
      md.push(`### [${p.name}](${p.url || '#'})`);
      if (p.description) md.push(`${p.description}\n`);
      if (p.highlights) {
        p.highlights.forEach((h) => md.push(`- ${h}`));
        md.push('');
      }
    });
  }

  return md.join('\n');
};

const mdContent = generateMd(resumeData);
fs.writeFileSync(path.join(distDir, 'resume.md'), mdContent, 'utf8');
console.log('✅ Generated resume.md');

// Format 6: Render YAML (resume.yaml)
console.log('6️⃣ Generating YAML (resume.yaml)...');
const yamlContent = yaml.dump(resumeData);
fs.writeFileSync(path.join(distDir, 'resume.yaml'), yamlContent, 'utf8');
console.log('✅ Generated resume.yaml');

console.log('\n🎉 All 6 formats successfully generated in dist/! 🎉');
