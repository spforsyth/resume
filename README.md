# 📄 JSON Resume Builder & Publisher

Automated JSON Resume publisher built with Node.js and **`jsonresume-theme-even`**. Whenever `resume.json` is updated in the repository, GitHub Actions automatically validates the schema, compiles the resume into **6 export formats**, and publishes the live site to **GitHub Pages**.

🌐 **Live Resume URL:** [https://spforsyth.github.io/resume](https://spforsyth.github.io/resume)

---

## 🛠️ Exported Formats

Every build generates 6 distinct resume formats into the `dist/` directory, accessible directly from the live web toolbar:

| Format | File | Description |
| :--- | :--- | :--- |
| **🌐 HTML** | [`index.html`](https://spforsyth.github.io/resume/) | Interactive web resume rendered with `jsonresume-theme-even` |
| **📕 PDF** | [`resume.pdf`](https://spforsyth.github.io/resume/resume.pdf) | Print-ready A4 PDF generated via headless Puppeteer Chrome |
| **📝 TXT** | [`resume.txt`](https://spforsyth.github.io/resume/resume.txt) | Plain-text ASCII summary formatted for ATS parsers |
| **⚙️ JSON** | [`resume.json`](https://spforsyth.github.io/resume/resume.json) | Standard JSON Resume raw data asset |
| **✍️ Markdown** | [`resume.md`](https://spforsyth.github.io/resume/resume.md) | Structured GitHub-Flavored Markdown document |
| **📋 YAML** | [`resume.yaml`](https://spforsyth.github.io/resume/resume.yaml) | Serialized YAML resume specification |

---

## 🚀 How It Works

1. **Edit Resume**: Modify `resume.json` in the root of the repository.
2. **Push Changes**: Commit and push to the `main` branch on GitHub.
3. **Automated Pipeline**:
   - GitHub Actions checks out the repository.
   - Installs dependencies (`resumed`, `jsonresume-theme-even`, `puppeteer`, `js-yaml`).
   - Runs `npm run build` to generate all 6 formats into `dist/`.
   - Injects a fixed format switcher header bar into `index.html`.
   - Deploys `dist/` directly to **GitHub Pages**.

---

## 💻 Local Development

To test resume generation or customize formatting locally:

```bash
# 1. Install dependencies
npm install

# 2. Build all 6 formats to dist/
npm run build

# 3. Preview locally
npm run dev
```

---

## ⚙️ Repository Setup for GitHub Pages

To ensure GitHub Actions can deploy your site:
1. Open your repository settings on GitHub: `https://github.com/spforsyth/resume/settings/pages`
2. Under **Build and deployment** -> **Source**, select **GitHub Actions**.
3. Any push to `main` will trigger `.github/workflows/build-and-deploy.yml` and publish your resume!
