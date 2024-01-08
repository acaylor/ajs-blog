# Blog powered by hugo

This repo is used to build my personal blog. 

Posts are created in [markdown][2] format and a program called [Hugo][3] takes those files and generates a set of HTML and CSS files necessary to run a website on a web server.

## Example blog

I have uploaded an example hugo blog on [my personal gitlab profile][4]. I will be outlining the process to create that example blog below.

### 1. Prerequisites: Hugo and git

* Hugo: https://gohugo.io/getting-started/installing/
* Git: https://git-scm.com/book/en/v2/Getting-Started-Installing-Git

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

### 4. Configure the site

The default config file `config.toml` can be deleted. Next create a directory called `config` and then `_default` within.

```bash
rm config.toml
mkdir -p config/_default
```

Within this new directory, create four files to configure the hugo theme:

* `config.toml` : This is the main hugo configuration.
* `languages.toml` : This theme supports using multiple languages at the same time.
* `menus.en.toml` : This is the config for english toolbar menu on the site.
* `params.toml` : This is specific configuration for the hugo theme.

#### config.toml

```toml

```

#### languages.toml

```toml

```

#### menus.en.toml

```toml

```

#### menus.ko.toml

```toml

```

#### params.toml

```toml

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

![hugo](images/hugo.png)

 [1]: https://www.git-scm.com/book/en/v2/Getting-Started-What-is-Git%3F
 [2]: https://www.markdownguide.org/
 [3]: https://gohugo.io/
 [4]: https://gitlab.com/acaylor/example_blog
 [5]: https://git-scm.com/book/en/v2/Git-Tools-Submodules