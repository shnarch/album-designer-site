# Album Designer: website and downloads

The public website for Album Designer (https://shnarch.github.io/album-designer-site/) and the page where
its installers are published (Releases). The app's code lives in a private repository.

- `index.html`, `style.css`, `site.js`, `i18n.js`: the page (English and Hebrew; no build step).
- `latest.json`: the newest version, its installer and what's new. The page and the app's "a new version
  is available" notice read it. Written by `packaging/publish_site.py` in the app repo when a release is published.
- `videos.json`: the video library. A video is one entry; add its YouTube id to `youtube` to show it.
- `config.js`: the feedback relay address (`worker/README.md`).
- `worker/`: the small relay that turns feedback into labelled issues in the private repo.

To preview locally: `python3 -m http.server 8810` in this folder, then open http://localhost:8810.
