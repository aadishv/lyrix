# Lyrix 🎵

Lyrix is a powerful song organizer and lyrics analysis tool designed for music lovers and researchers. It allows you to build your personal music library, analyze lyrical content, and uncover deeper insights with AI-powered data analysis.

## ✨ features

* **song organization**: build and manage your personal music library.
* **lyrics integration**: fetch and display song lyrics using the MusixMatch API with community access.
* **youtube integration**: link music videos from YouTube directly to songs in your library.
* **in-depth analysis**: add comments and annotations to specific lyric selections.
* **ai-powered insights**: leverage artificial intelligence for complex data analysis of lyrical themes, patterns, and sentiment.
* **collaboration**: generate shareable links to your libraries, allowing others to view or clone them.

## 🛠️ tech stack

* **frontend**: React, Vite, Wouter, nuqs, Tailwind CSS, shadcn/ui
* **backend**: Convex
* **apis**:
    * [MusixMatch API](https://developer.musixmatch.com/) for fetching song lyrics with community access.
    * [YouTube API](https://developers.google.com/youtube/v3) for video integration and search.

## ⚠️ known issues

* **MusixMatch API Rate Limiting**: The current MusixMatch implementation may encounter 401 errors with captcha challenges due to rate limiting or bot detection. This is a known limitation of the scraping-based approach. The system includes improved error handling and will provide clear error messages when this occurs. Consider using official API access or trying again later if you encounter these issues.

## 🚀 roadmap

our project is under active development. here is our current progress:

* ✅ **core functionality**
    * [x] personal song library (`My Library`)
    * [x] song database (`Songs`)
    * [x] lyrics fetching via MusixMatch API with debouncing
* 📝 **upcoming features**
    * [ ] youtube api integration (search and link mvs)
    * [ ] advanced commenting (link comments to lyric selections)
    * [ ] shareable library links
    * [ ] library cloning
    * [ ] ai-powered complex data analysis
    * [ ] cvx file uploading
    * [ ] attach and edit mv screenshots with timestamps in comments

## 🤝 contributing

contributions are welcome! if you'd like to contribute, please fork the repository and create a pull request. you can also open an issue with the "enhancement" tag.

1.  fork the project
2.  create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  push to the branch (`git push origin feature/AmazingFeature`)
5.  open a pull request

## 📄 license

this project is licensed under the MIT License. see the `LICENSE` file for more information.
