---
title: Pandoc converter
author: aj
date: 2021-09-05
categories:
  - Utilities
tags:
  - pandoc
  - file conversion

---

There is a useful software application out there called Pandoc which is a [Haskell][1] library for converting from one markup format to another through a command line interface. Pandoc can convert between [markdown][2], [HTML][3], and proprietary formats like [Microsoft Word][4].

## Installing

The official site for pandoc includes instructions to install on multiple platforms such as Windows, Linux and macOS.

https://pandoc.org/installing.html


## Example

See the following example of converting a markdown file to an HTML file:

```bash
pandoc -o converted_file.html source_file.md
```

If pandoc is successful, you will now have a new file called `converted_file.html`.

 [1]: https://www.haskell.org/
 [2]: https://daringfireball.net/projects/markdown/
 [3]: https://www.w3.org/html/
 [4]: https://en.wikipedia.org/wiki/Office_Open_XML
 [5]: https://pandoc.org/
 