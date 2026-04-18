---
title: Openwebui with postgres
author: aj
date: 2024-10-26
draft: true
categories:
  - AI
  - Homelab
tags:
  - ai
  - postgres
  - postgresql
  - open-webui
---

After running LLMs locally using Ollama and open-webui for over 100 days, I noticed my usage decreased over time as the novelty wore off. After not using the application for about a week, I logged on a Saturday morning to ask a random question but the web console was blank after logging in.

Turns out the sqlite3 database had been corrupted so all of my previous chats were wiped out along with the configuration for the open-webui application.

This is a good opportunity to configure open-webui to use Postgres instead of sqlite3 as the backend database.
