# dev-service

> Manage docker services for local development

## Prerequisites

- a local or remote docker host
- a docker client connected to that host
- `docker` and `docker-compose` located in your `$PATH`
- `node` v8.x, v10.x, v12.x or higher

## Install

Add the module within your dev repo:

```bash
$ yarn add @uscreen.de/dev-service
```

## Usage

### Preparations

To use one or multiple services for development, just add a list to your existing package.json, i.e.:

```json
"services": [
  "mongo:4",
  "nginx:latest",
  "redis"
]
```

Since this tool uses docker-compose for managing the services, we use the docker-specific image notation.

Next run `service install` and you will end up with a directory structure like:

```bash
.
├── node_modules
│   └── ...
├── package.json
│
├── services
│   ├── .compose
│   │   ├── mongo.yml
│   │   ├── nginx.yml
│   │   └── redis.yml
│   │
│   └── nginx/default.conf
│       ├── conf.d
│       │   └── default.conf
│       └── ssl
│           └── README
│
└── yarn.lock
```

### Running

Before running the services you should ensure that the used ports (see below) are not occupied by other applications or services running locally on your computer.

Start all services with `service start`. You can run `service list` to see the stats of the started services, use `service logs` for showing the services' logs (abort with ⌘-C).

By default, the started nginx service returns `Hello World` when called via `curl localhost`.

Stop the services with `service stop`.

## API

### $ service install

Install all services specified in package.json.

### $ service start [service]

Start given or installed service(s).

### $ service stop [service]

Stop given or running service(s).

### $ service restart [service]

Restart given or installed service(s).

### $ service list

List running services.

### $ service logs [service]

Show logs of given or running services (abort with ⌘-C).

## Services

All provided services use their respective default ports:

| service | used ports  |
|---------|-------------|
| redis   | 6379        |
| mongo   | 27017       |
| nats    | 4222, 8222  |
| nginx   | 80, 443     |

### nginx

The nginx service is configurable. You can modify the configuration(s) under `./services/nginx/conf.d/`, where you can also find the example `default.conf`. Additionally, you can drop some ssl certificate files in `./services/nginx/ssl/`. The service will find them under `/etc/nginx/ssl/`, so use this path in your configurations.

Your folder structure may look like this:

```
.
└── services
    ├── .compose
    │   └── nginx.yml
    │
    └── nginx/default.conf
        ├── conf.d
        │   ├── default.conf
        │   └── someother.conf
        └── ssl
            ├── your.domain.pem
            └── your.domain.key
```

In `default.conf` and/or `someother.conf`:

```
...
ssl_certificate /etc/nginx/ssl/your.domain.pem;
ssl_certificate_key /etc/nginx/ssl/your.domain.key;
...
```
---

## Roadmap

- Adding tests for `service logs [servicename]`

- enabling customizing services with a subset of docker-compose directives

- making tests work in gitlab-ci
- making tests work in parallel

## Changelog

### v0.3.0

- expanding `service start`, `service stop` and `service logs` by optional `[service]` parameter
- adding `service restart`

### v0.2.2

- upgrading packages

### v0.2.1

- fixing typo in readme

### v0.2.0

- adding `service logs`

### v0.1.1

- making git ignore services/.compose folder

### v0.1.0

- initial version

---

## License

Licensed under [MIT](./LICENSE).

Published, Supported and Sponsored by [u|screen](https://uscreen.de)
