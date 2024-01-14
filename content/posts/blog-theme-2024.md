---
title: 2024 New Blog Theme
author: aj
date: 2024-01-08
draft: true
categories:
  - Utilities
tags:
  - Hugo
  - git
  - markdown
  - blog

---

This blog is managed in a private [git][1] repository. Posts are created in [markdown][2] format and a program called [Hugo][3] takes those files and generates a set of HTML and CSS files necessary to run a website on a web server. Instead of using a Hugo theme made by someone else, I have created my own theme that is more lightweight and I will be able to maintain.


## Previous theme

The previous theme used:

![hugo](/images/hugo.png)

There is an a [previous post][6] that walks through configuring this blog with that old theme.

## New theme

The content for this blog is all in markdown files. After a few changes to config files, the new theme applies to the existing blog and retains the content from before. Below I can walk through creating a blog themed site with Hugo and the theme used by this site.

### ajsTheme

I have created a theme using [bootstrap][7] and it is available on [GitHub][8]

![ajsTheme](/images/ajsThemeDark.png)

---

## Example blog

I have uploaded an example hugo blog on [my personal gitlab profile][4]. Check that out for the theme configuration.

### Prerequisites: Hugo and git

* Hugo: [Installing documentation](https://gohugo.io/getting-started/installing/)
* Git: [Getting started installing git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)

Both of these programs are available for macOS, Linux, and Windows.

### Optional: Create a new site

Once hugo is installed, create a new site by typing the following command into your shell:

```shell
hugo new site example_blog
```

This will create some new directories for use with hugo.

#### Alternative

Alternatively, you can download the example blog from my GitLab. If you do that do not run the command above to create a new site.

### Add a theme to the site

Now that the skeleton structure of the site has been created, here is how to add the same theme that is used by this blog:

```shell
cd example_blog
git init
git submodule add $giturl themes/$themename
```

Replace `$giturl` with the git url of the theme you want to use. The [theme I created][8] can be used.

Replace `$themename` with the name of the theme you have chosen. Usually this would be the name of the git repo for the theme.

In powershell the commands should be the same but always press <key>TAB</key> when entering the name of a file or directory for the shell to auto-complete you command.

### Configure the site

The default config file `config.toml` can be deleted. Next create a directory called `config` and then `_default` within.

```shell
rm config.toml
mkdir -p config/_default
```

In powershell:

```powershell
Remove-Item '.\config.toml'
New-Item -Path '.\config'
New-Item -Path '.\config\_default'
```

Within this new directory, create files to configure the hugo theme:

* `config.toml` : This is the main hugo configuration.
* `menus.toml` : This is the config for toolbar menu on the site.

#### config.toml

Basic example that is included in the git repo:

```toml
baseURL = "http://blog.example/"
languageCode = "en-us"
title = "Example Blog"
theme = "ajsTheme"
```

### Add content

In this example, new pages in English are added to the directory `content`. The first file added should be `_index.md`.

```content/posts/_index.md
---
title: "Posts"
date: 2020-10-20
description: All posts
---
```

Create a new post:

```content/posts/hello-world.md
---
title: Hello world!
author: aj
date: 2021-04-10T22:43:20+00:00
categories:
  - Homelab

---
This is my first post.
This blog will be focused on hybrid cloud technologies.
Stay tuned for more.
```

### Updating theme

A theme for Hugo sites can be a [git submodule][5] that is updated with the following command:

```bash
git submodule update --remote --merge
```

## Test the site

Run the following command to test the site on your local machine. The web server will be available at `localhost` port `1313`.

```bash
hugo server -D
```

You can view the site in your browser:

`http://127.0.0.1:1313`

![example_blog](/images/example_blog_light_20240108.png)

Dark theme:

![example_blog_dark](/images/example_blog_dark_20240108.png)

 [1]: https://www.git-scm.com/book/en/v2/Getting-Started-What-is-Git%3F
 [2]: https://www.markdownguide.org/
 [3]: https://gohugo.io/
 [4]: https://gitlab.com/acaylor/example_blog
 [5]: https://git-scm.com/book/en/v2/Git-Tools-Submodules
 [6]: /posts/building-this-blog/
 [7]: https://getbootstrap.com/
 [8]: https://github.com/acaylor/ajsTheme
