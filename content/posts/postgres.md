---
title: PostgreSQL
author: aj
image: /images/pg_logo.png
date: 2024-09-02

categories:
  - Database Management
tags:
  - postgres
  - postgresql
  - database
---

[PostgreSQL][1] is a relational database management system. It is extremely popular as it is open source and scales to billions of rows. Other popular DBMS systems include some that are not open source. There are some open source apps that I use at home that require a database and I am interested in spending more time developing my own software. This post will go over the basics of using a PostgreSQL database. Here are some other database systems that you may have heard of:

- MySQL
- MariaDB
- Microsoft SQL Server

There is a chance that you have used an application that leverages a relational database. With the rise of containers and apps like Docker, it is easier than ever to create and manage Postgres database servers.

## Getting started

Before you start, you should confirm that you don’t already have `psql` installed. This also assumes a basic understanding of what a database is along with concepts such as tables, columns, and rows. Search the web or wikipedia for "SQL" for more details.

### Install psql on macOS

If on macOS, I recommend homebrew to install the `psql` client only:

```bash
brew install libpq

brew link --force libpq

```

### Install psql on Debian based linux

On Linux distributions that use `apt` , there should be a postgresql client package to install:

```bash
sudo apt-get update
sudo apt-get install postgresql-client
```

### Install psql on windows

On Windows you can install postgres using an installer provided by the official site: <https://www.postgresql.org/download/windows/>


### Interact with a database

Use `psql` to execute commands on the database server. Ensure the client is working:

```bash
psql --version
```

This client can be used to access any database server that you can access via networking.

### Create a postgres server with Docker

The easiest way to create a database server is with a container. If you are not familiar with containers, check out [a previous post][2]. If you are on Windows this may not be needed if you install a postresql server using the installer.

```bash
docker run --name postgres -p 5432:5432 -e POSTGRES_PASSWORD=mysecretpassword -d postgres
```

This will set the password for the default user `postgres` to the value of the environment variable `POSTGRES_PASSWORD`. The container will forward connections to port 5432 on the system where docker is installed.

Enter this command to connect:

`psql -h localhost -U postgres`

This will prompt for the password.

### Create database

Once logged into the server, create a database and table using SQL statements.

`CREATE DATABASE "development";`

This command creates a new database called "development". It is best practice to create a new database instead of using the default database "postgres". Then you can log out of the default database "postgres"

Enter the command `\q` and then <key>ENTER</key> to log out of the database.

### Connect to new database

Enter this command to connect to the newly created database:

`psql -h localhost -U postgres development`

The shell should be `development=# `

Create a new table with SQL statement:

```sql
CREATE TABLE "user" (
	id SERIAL PRIMARY KEY,
	name VARCHAR(255),
	email VARCHAR(255),
	password TEXT
);
```

SQL is not sensitive to blank spaces. The semicolon marks the end of the command instructions.

If successful should output:

`CREATE TABLE`

We have now created a new table for storing data. The SQL command defined the schema for this table and we defined what time of data will be stored in each column. The table includes a unique identifier for each row known as the primary key. Each row will include the name of a user, their email, and a password. This is a basic example because you should not store passwords in plain text.

### Create records in new table

Once you have created a table, you can insert new records into the database using SQL.

```sql
INSERT INTO "user" (email, name, password) 
	VALUES ('john@example.net','John', 'qngkdir4gt');
```

It does not matter what order you define what columns you wish to insert new data but the values must be presented in the same order.

If successful should output:

`INSERT 0 1`

Add another record:

```sql
INSERT INTO "user" (email, name, password) 
	VALUES ('test@fake.domain','Jimmy', 'lm1sixabztmrxq');
```

Now the user table should have columns and rows defined. Use a `SELECT` query to retrieve data.

```sql
SELECT * FROM "user";
```

This query should return the two new rows:

```
 id | name  |      email       |    password    |  
----+-------+------------------+----------------+-------
  1 | John  | john@example.net | qngkdir4gt     |    
  2 | Jimmy | test@fake.domain | lm1sixabztmrxq |    
```

That is a single table but SQL is useful for more complex relationships between data. So far our database has one table to store users. You can create multiple tables within the database and create relationships between the tables. That is beyond the scope of what I am posting today. In fact Data Structures is an entire semester long course at University.

## Next steps

We could use this database to create a web application. A login form can be created and the database can be used to authorize users. If you have used spreadsheet software, a database allows you to take things to the next level and organize data with millions and even billions of rows. In fact one of the most popular Python libraries makes it easy to load data from a spreadsheet into a database.

Here is a cool Website that helps to visualize a database <https://drawsql.app/>

 [1]: https://www.postgresql.org/
 [2]: /posts/containers/