# dev-service

> Manage services for local development

## Install

Add the module within your dev repo:

```bash
$ yarn add @uscreen.de/dev-service
```

## Usage

To use one or multiple services for development, just add a list to your existing package.json, i.e.:

```json
"services": [
  "mongo:latest",
  "nginx:latest",
  "redis:5.0"
]
```

Since this tool uses docker-compose for managing the services, we use the docker-specific image notation.

Next run `service install` and you will end up with a directory structure like:

```bash
.
├── package.json
├── services
│   ├── .compose
│   │   ├── mongo.yml
│   │   ├── nginx.yml
│   │   └── redis.yml
│   │
│   └── nginx/default.conf
│
└── yarn.lock
```

Start all services with `service start`, stop them with `service stop`.

## API

### $ service install

Install all services specified in package.json.

### $ service start

Start installed services.

### $ service stop

Stop running services.

### $ service list

List running services.
