---
title: Building this blog with Hugo
author: aj
date: 2021-06-21
categories:
  - Utilities
tags:
  - Hugo
  - git
  - markdown
  - blog

---

This blog is managed in a private [git][1] repository. Posts are created in [markdown][2] format and a program called [Hugo][3] takes those files and generates a set of HTML and CSS files necessary to run a website on a web server.

## Example blog

I have uploaded an example hugo blog on [my personal gitlab profile][4]. I will be outlining the process to create that example blog below.

### 1. Prerequisites: Hugo and git

* Hugo: https://gohugo.io/getting-started/installing/
* Git: https://git-scm.com/book/en/v2/Getting-Started-Installing-Git

Both of these programs are available for macOS, Linux, and Windows.

### 2. Create a new site

Once hugo is installed, create a new site by typing the following command into your shell:

```bash
hugo new site example_blog
```

This will create some new directories for use with hugo.

### 3. Add a theme to the site

Now that the skeleton structure of the site has been created, here is how to add the same theme that is used by this blog:

```bash
cd example_blog
git init
git submodule add https://github.com/zzossig/hugo-theme-zzo.git themes/zzo
```

In powershell the commands should be the same but always press <key>TAB</key> when entering the name of a file or directory for the shell to auto-complete you command.

### 4. Configure the site

The default config file `config.toml` can be deleted. Next create a directory called `config` and then `_default` within.

```bash
rm config.toml
mkdir -p config/_default
```

In powershell:

```powershell
Remove-Item '.\config.toml'
New-Item -Path '.\config'
New-Item -Path '.\config\_default'
```

Within this new directory, create four files to configure the hugo theme:

* `config.toml` : This is the main hugo configuration.
* `languages.toml` : This theme supports using multiple languages at the same time.
* `menus.en.toml` : This is the config for english toolbar menu on the site.
* `params.toml` : This is specific configuration for the hugo theme.

#### config.toml

```toml
baseURL = "http://example.org"
title = "Hugo Zzo Theme"
theme = "zzo"

defaultContentLanguage = "en"
defaultContentLanguageInSubdir = true
hasCJKLanguage = true

summaryLength = 70
buildFuture = true

copyright = "&copy;{year}, All Rights Reserved"
timeout = 10000
enableEmoji = true
paginate = 13
rssLimit = 100

enableGitInfo = false
googleAnalytics = ""

[markup]
  [markup.goldmark]
    [markup.goldmark.renderer]
      hardWraps = true
      unsafe = true
      xHTML = true
  [markup.highlight]
    codeFences = true
    lineNos = true
    lineNumbersInTable = true
    noClasses = false
  [markup.tableOfContents]
    endLevel = 4
    ordered = false
    startLevel = 2

[outputs]
  home = ["HTML", "RSS", "SearchIndex"]
  section = ["HTML", "RSS", "SearchIndex"]
  taxonomy = ["HTML", "RSS", "SearchIndex"]

[outputFormats]
  [outputFormats.SearchIndex]
    mediaType = "application/json"
    baseName = "index"
    isPlainText = true
    notAlternative = true

[taxonomies]
  category = "categories"
  tag = "tags"
  series = "series"
```

#### languages.toml

```toml
[en]
  title = "Hugo Zzo Theme"
  languageName = "English"
  weight = 1
  languagedir = "ltr"
  contentdir = "content/en"

[ko]
  title = "Hugo Zzo Theme"
  languageName = "한국어"
  weight = 2
  languagedir = "ltr"
  contentdir = "content/ko"

```

#### menus.en.toml

```toml
[[main]]
  identifier = "about"
  name = "About"
  url = "about"
  weight = 1

[[main]]
  identifier = "archive"
  name = "Archive"
  url = "archive"
  weight = 2

[[main]]
  identifier = "presentation"
  name = "Pt"
  url = "presentation"
  weight = 3

[[main]]
  identifier = "gallery"
  name = "Gallery"
  url = "gallery"
  weight = 4
    
[[main]]
  parent = "gallery"
  name = "Cartoon"
  url = "gallery/cartoon"

[[main]]
  parent = "gallery"
  name = "Photo"
  url = "gallery/photo"

[[main]]
  identifier = "posts"
  name = "Posts"
  url = "posts"
  weight = 5

[[main]]
  identifier = "showcase"
  name = "Showcase"
  url = "showcase"
  weight = 6

[[main]]
  identifier = "publication"
  name = "Pub"
  url = "publication"
  weight = 7
```

#### menus.ko.toml

```toml
[[main]]
  identifier = "about"
  name = "어바웃"
  url = "about"
  weight = 1

[[main]]
  identifier = "archive"
  name = "아카이브"
  url = "archive"
  weight = 2

[[main]]
  identifier = "gallery"
  name = "갤러리"
  url = "gallery"
  weight = 3
    
[[main]]
  parent = "gallery"
  name = "fiverr"
  url = "gallery/mine"

[[main]]
  identifier = "posts"
  name = "포스트"
  url = "posts"
  weight = 4
```

#### params.toml

```toml
logoText = "Example Blog"
logoType = "short" # long, short
description = "The Zzo theme for Hugo example site."
custom_css = []
custom_js = []
useFaviconGenerator = true # https://www.favicon-generator.org/
meta_image = ""
themecolor = ""

themeOptions = ["dark", "light", "hacker", "solarized", "kimbie"]
notAllowedTypesInHome = ["contact", "talks", "about", "showcase", "publication", "presentation", "resume"]
notAllowedTypesInHomeSidebar = ["about", "archive", "showcase", "publication", "presentation", "resume"]
notAllowedTypesInArchive = ["about", "talks", "showcase", "publication", "presentation", "resume"]
notAllowedTypesInHomeFeed = ["about", "archive", "contact", "talks", "showcase", "publication", "presentation", "resume", "gallery"]

viewportSize = "normal" # widest, wider, wide, normal, narrow
enableUiAnimation = true
hideSingleContentsWhenJSDisabled = false
enablePinnedPosts = true
minItemsToShowInTagCloud = 1 # Minimum items to show in tag cloud

# appbar
enableAppbarSearchIcon = false
enableAppbarLangIcon = false

# header
homeHeaderType = "text" # text, img, slide, typewriter
hideHomeHeaderWhenMobile = false

# menu
showMobileMenuTerms = ["tags", "categories", "series"]

# search
enableSearch = true
enableSearchHighlight = true
searchResultPosition = "main" # side, main
searchContent = true # include content to search index
searchDistance = 100 # fuse option
searchThreshold = 0.4 # 0.0: exact match, 1.0: any match

# body
enableBreadcrumb = true
enableGoToTop = true
enableWhoami = true
summaryShape = "classic" # card, classic, compact
archiveGroupByDate = "2006" # "2006-01": group by month, "2006": group by year
archivePaginate = 13
paginateWindow = 1
talksPaginate = 5
talksGroupByDate = "2006"
pubPaginate = 20
writtenTimeIcon = "📅"
modifiedTimeIcon = "📝"
readingTimeIcon = "☕"
authorIcon = "✍️"
pagePvIcon = "👀"
pinIcon = "📌"
tagIcon = "🏷️"
publicationIcon = "📚"
typeIcon = "🎯"

# whoami
myname = "blogger"
email = "email@example.com"
whoami = "Developer"
bioImageUrl = ""
useGravatar = false
location = "United States of America"
organization = "Hugo"
link = "https://website.example.com"

# sidebar
enableBio = true
enableBioImage = true
enableSidebar = true
enableSidebarTags = true
enableSidebarSeries = true
enableSidebarCategories = true
enableHomeSidebarTitles = true
enableListSidebarTitles = true
enableToc = true
hideToc = false
tocFolding = true
tocPosition = "inner" # inner, outer
enableTocSwitch = true
itemsPerCategory = 5
sidebarPosition = "right"
tocLevels = ["h2", "h3", "h4"]
enableSidebarPostsByOrder = false

# footer
showPoweredBy = true
showFeedLinks = true
showSocialLinks = true
enableLangChange = true
enableThemeChange = true

# service
googleTagManager = "" # GTM-XXXXXX
baiduAnalytics = ""
enableBusuanzi = false
busuanziSiteUV = true
busuanziSitePV = true
busuanziPagePV = true

# rss
updatePeriod = "" # Possible values: 'hourly', 'daily', 'weekly', 'monthly', or 'yearly'.
updateFrequency = ""
fullContents = false

# comment
enableComment = true
disqus_shortname = ""
commento = false

[telegram]
  enable = false
  siteId = ""
  dataLimit = 5

[gitment]          # Gitment is a comment system based on GitHub issues. see https://github.com/imsun/gitment
  owner = ""              # Your GitHub ID
  repo = ""               # The repo to store comments
  clientId = ""           # Your client ID
  clientSecret = ""       # Your client secret

[utterances]       # https://utteranc.es/
  owner = ""              # Your GitHub ID
  repo = ""               # The repo to store comments

[gitalk]           # Gitalk is a comment system based on GitHub issues. see https://github.com/gitalk/gitalk
  owner = ""              # Your GitHub ID
  repo = ""               # The repo to store comments
  clientId = ""           # Your client ID
  clientSecret = ""       # Your client secret

# Valine.
# You can get your appid and appkey from https://leancloud.cn
# more info please open https://valine.js.org
[valine]
  enable = false
  appId = '你的appId'
  appKey = '你的appKey'
  notify = false  # mail notifier , https://github.com/xCss/Valine/wiki
  verify = false # Verification code
  avatar = 'mm' 
  placeholder = '说点什么吧...'
  visitor = false

[changyan]
  changyanAppid = ""        # Changyan app id             # 畅言
  changyanAppkey = ""       # Changyan app key

[livere]
  livereUID = ""            # LiveRe UID                  # 来必力

# Isso: https://posativ.org/isso/
[isso]
  enable = false
  scriptSrc = "" # "https://isso.example.com/js/embed.min.js"
  dataAttrs = "" # "data-isso='https://isso.example.com' data-isso-require-author='true'"

[socialOptions]
  email = "mailto:your@email.com"
  phone = ""
  facebook = ""
  twitter = "http://example.org/"
  github = "https://github.com/zzossig/hugo-theme-zzo"
  stack-overflow = ""
  instagram = "http://example.org/"
  google-plus = ""
  youtube = "http://example.org/"
  medium = ""
  tumblr = ""
  linkedin = "http://example.org/"
  pinterest = ""
  stack-exchange = ""
  telegram = ""
  steam = ""
  weibo = ""
  douban = ""
  csdn = ""
  gitlab = "http://example.org/"
  mastodon = ""
  jianshu = ""
  zhihu = ""
  signal = ""
  whatsapp = ""
  matrix = ""
  xmpp = ""
  dev-to = ""
  gitea = ""
  google-scholar = ""

[donationOptions]
  enable = false
  alipay = "" 
  wechat = ""
  paypal = ""
  patreon = ""

# possible share name: ["facebook","twitter", "reddit", "linkedin", "tumblr", "weibo", "douban", "line", "pocket", "feedly", "hatena", "pinterest", "delicious", "google"]
[[share]]
  name = "linkedin"
  username = ""
[[share]]
  name = "reddit"

[[footerLinks]]
  name = "site1"
  link = "http://example.org/"
[[footerLinks]]
  name = "site2"
  link = "http://example.org/"
```

### 5. Add content

In this example, new pages in English are added to the directory `content/en`. The first file added should be `_index.md`.

```content/en/posts/_index.md
---
title: "Posts"
date: 2020-10-20
description: All posts
---
```

Create a new post:

```content/en/posts/hello-world.md
---
title: Hello world!
author: aj
date: 2021-04-10T22:43:20+00:00
categories:
  - Homelab

---
This is my first post. This blog will be focused on hybrid cloud technologies. Stay tuned for more.
```

### Updating theme

The theme uses a [git submodule][5] that is updated with the following command:

```bash
git submodule update --remote --merge
```

## Test the site

Run the following command to test the site on your local machine. The web server will be available at `localhost` port `1313`.

```bash
hugo server -D
```

You can view the site in your browser:

![hugo](/images/hugo.png)

 [1]: https://www.git-scm.com/book/en/v2/Getting-Started-What-is-Git%3F
 [2]: https://www.markdownguide.org/
 [3]: https://gohugo.io/
 [4]: https://gitlab.com/acaylor/example_blog
 [5]: https://git-scm.com/book/en/v2/Git-Tools-Submodules