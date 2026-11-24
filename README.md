# Md Omor Faruk — Academic Portfolio

**Live site:** https://omorovi.github.io/mdomorfaruk/  


A personal academic website for GitHub Pages, with a password-protected admin dashboard
for updating content without editing code.

## Publish the site (one time, ~10 minutes)

1. **Create the repository.** On GitHub, click **New repository**. Name it exactly
   `YOUR-USERNAME.github.io` (with your GitHub username) and make it **Public**.
2. **Upload the files.** Unzip the website folder. In the new repository, click
   **Add file → Upload files**, then drag in **everything inside the folder**:
   `index.html`, `research.html`, `publications.html`, `news.html`, `robots.txt`,
   `.nojekyll`, and the `admin`, `assets`, `data`, `files` and `images` folders.
   Click **Commit changes**.
   *Tip: on macOS, files starting with a dot are hidden. Press Cmd + Shift + . in Finder to show `.nojekyll`.*
3. **Turn on Pages.** Go to **Settings → Pages** and set **Source** to
   *Deploy from a branch*, **Branch** to `main` and the folder to `/ (root)`, then click **Save**.
4. After 1–2 minutes your site is live at `https://YOUR-USERNAME.github.io`.

## Set up the admin dashboard (one time per browser)

1. Go to `https://YOUR-USERNAME.github.io/admin/`.
2. Create a GitHub access token (the setup page has a direct link):
   - Open **GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
   - **Repository access:** *Only select repositories* → your `YOUR-USERNAME.github.io` repository.
   - **Permissions → Repository permissions → Contents:** *Read and write*.
   - Pick an expiration date, click **Generate token** and copy it.
3. Paste the token into the setup page and choose an **admin password**. Click **Connect**.

From then on, open `/admin/` and enter your password. The token is stored **encrypted with your
password** in that browser only, and no one can change your site without it.

## Using the dashboard

| Section | What you can do |
|---|---|
| **News & Updates** | Add, edit or delete posts with a headline, date, category, description, multiple photos (resized automatically) and optional links. Newest posts appear first. |
| **Publications** | Add papers, or change a paper's status (e.g. *Under Review → Accepted*) or category. Enter only the DOI; the link is created for you. Your name is bolded in author lists automatically. |
| **Research Projects** | Add projects and set their order. Only the fields you fill in are shown. |
| **About Me** | Edit your introduction, photo, research interests and profile links (Google Scholar, ORCID, LinkedIn, GitHub, ResearchGate, CV PDF), and the Education, Experience and other CV sections. |
| **Settings** | Change the admin password or remove the saved login from a shared computer. |

Each **Save & publish** saves the change to your GitHub repository, and the live site updates in
about a minute. Your repository's **Commits** page keeps every past version, so any change can be undone.

## How it's built

- Plain HTML, CSS and JavaScript with no build step, so it loads fast and is easy to host.
- All content lives in `data/*.json`. Uploaded photos go to `images/news/` and `images/uploads/`, and uploaded files to `files/`.
- The dashboard (`admin/`) saves changes through GitHub's official API. It is hidden from search engines.
- Page titles, descriptions, Open Graph tags and Person structured data are set for search engines.

**Previewing on your own computer:** the pages load their content from the JSON files, so opening
`index.html` by double-clicking it won't work. Run `python3 -m http.server` in the folder and open
http://localhost:8000 instead.

**Using a custom domain later** (e.g. omorfaruk.com): add it under **Settings → Pages → Custom domain**.
The dashboard keeps working; you'll just enter your username and repository name by hand during setup.
