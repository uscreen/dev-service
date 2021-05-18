# dev-service

[![Build Status](https://travis-ci.com/uscreen/dev-service.svg?branch=master)](https://travis-ci.com/uscreen/dev-service)
[![Known Vulnerabilities](https://snyk.io/test/github/uscreen/dev-service/badge.svg?targetFile=package.json)](https://snyk.io/test/github/uscreen/dev-service?targetFile=package.json)

> Manage docker services for local development

## Prerequisites

- a local or remote docker host
- a docker client connected to that host
- `docker` and `docker-compose` located in your `$PATH`
- `node` v12.20 or higher, v14.13 or higher, or v15 or higher

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

Next, run `service install` and you will end up with a directory structure like:

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

Start all services with `service start`. You can run `service list` to see the stats of the started services, use `service logs` for showing the services' logs (abort with ⌘-C).

By default, the started Nginx service returns `Hello World` when called via `curl localhost`.

Stop the services with `service stop`.

### Preflight check

Before `service start` starts the services, it checks for two potential sources of error:

1. Are other dev-service instances already running? If so, an appropriate warning message is displayed.
2. Are ports already in use that are required by the services to be started? If so, an error message is displayed and the process is aborted.

This check can also be triggered separately via `service check`

#### Example 1:

```bash
$ service start
WARNING: dev-service is already running, started in following folder(s):
  /path/to/some-other-dev-repo
```

In this example, another dev-service instance is already running, but there are no port conflicts. So the current `service start` command is not cancelled.

#### Example 2:

```bash
$ service start
WARNING: dev-service is already running, started in following folder(s):
  /path/to/some-other-dev-repo

ERROR: Required port(s) are already allocated:
- port 4222 is used by process with pid 52956 (/usr/local/opt/nats-server/bin/nats-server)
```

In this example, the port is used by a service started by an already running dev-service instance. To solve the issue, just run `service stop` in the specified folder, i.e.:

```bash
$ cd /path/to/some-other-dev-repo
$ service stop
```

#### Example 3:

```bash
$ service start
ERROR: Required port(s) are already allocated:
- port 4222 is used by process with pid 52956 (/usr/local/opt/nats-server/bin/nats-server)
```

In this example, a running process (not started by dev-service) uses the port. This should be easily resolvable by killing that process, i.e.:

```bash
$ kill 52956
```

Please also check for supervised processes (pm2, launchd, etc.) in case of a process restarts after killing.

## API

### $ service install

Install all services specified in package.json.

#### Options

##### `--enable-volumes-id`

> ***experimental feature***

Creates a unique ID and uses it when naming the services' volumes, thus avoiding conflicts between volumes of different dev-service instances. Every subsequent call of `service install` will (re-)create volume names with the same ID.

**Warning**: With this option, already installed services will no longer use already existing volumes named the classical way.

##### `--enable-classic-volumes`

Disables volumes ID and uses the project name when naming the services' volumes.

**Warning**: With this option, installed services will no longer use already existing volumes named with volumes ID.

### $ service start [service]

Start all or given installed service(s).

By default, this command checks the port availability before starting any service(s).

### $ service stop [service]

Stop all or given running service(s).

### $ service restart [service]

Restart all or given installed service(s).

### $ service check [service]

Check port availability for all or given installed service(s).

### $ service list

List running services.

### $ service logs [service]

Show logs of all or given running services (abort with Ctrl-C).

## Provided services

All provided services use their respective default ports:

| service       | used ports  |
|---------------|-------------|
| redis         | 6379        |
| mongo         | 27017       |
| nats          | 4222, 8222  |
| nginx         | 80, 443     |
| rabbitmq      | 5672, 15672 |
| elasticsearch | 9200        |

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

## Customizing services

Besides the mentioned provided services, it's also possible to add customized services.

You can do this by adding an object with the appropriate docker-compose directives (compatible with compose file format 2.4) to the `services` array in your package.json.

Say you want to add a specific version of elasticsearch with some customizing environment variables. Your package.json may look like this:

```json
"services": [
  {
    "image": "docker.elastic.co/elasticsearch/elasticsearch:6.4.2",
    "ports": ["9200:9200"],
    "volumes": ["elasticsearch-data:/usr/share/elasticsearch/data:delegated"],
    "environment": [
      "cluster.name=dev-cluster",
      "cluster.routing.allocation.disk.threshold_enabled=false",
      "discovery.type=single-node",
      "thread_pool.bulk.queue_size=200"
    ]
  }
]
```

Running `service install` will automatically create a partial docker-compose file from this directives in your `services/.compose` folder:

```yaml
version: "2.4"
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:6.4.2
    container_name: "your-dev-repo_elasticsearch"
    ports:
      - 9200:9200
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data:delegated
    environment:
      - cluster.name=dev-cluster
      - cluster.routing.allocation.disk.threshold_enabled=false
      - discovery.type=single-node
      - thread_pool.bulk.queue_size=200
volumes:
  elasticsearch-data:
    external:
      name: "foobar-dev-repo-elasticsearch-data"
```

This action has the following features & caveats:

- The service's name is automatically derived from the service's image name. Installing a service without specifying an image will fail.
- An adequate `container_name` is automatically added and will overwrite any existing container name
- Volumes can only be given in "short syntax"
- All specified named volumes are automatically created if not already existing
- When referring to a file, keep in mind to specify the path relative to `services/.compose`

### Mapping host paths

If you want to map data from your host into a volume, it is best practice to put this data into a subfolder of the `services` folder, named after the service it's mapped to. Also, you should use a relative path inside your service definition. A good example of this is the provided Nginx service. If we would define it inside of our package.json, it would look like this:

```json
"services": [
  {
    "container_name": "your-dev-repo_nginx",
    "image": "nginx:latest",
    "ports": [
      "80:80",
      "443:443"
    ],
    "volumes": [
      "../nginx/conf.d:/etc/nginx/conf.d",
      "../nginx/ssl:/etc/nginx/ssl"
    ]
  }
]
```

And the folder structure would look like this:

```bash
.
└── services
    ├── .compose
    │   ├── nginx.yml
    │
    └── nginx/default.conf
        ├── conf.d
        │   └── default.conf
        └── ssl
            └── README
```

---

## Roadmap

- make `service check [servicename]` recognize and ignore own services
- add tests for `service check [servicename]`
- add tests for service customization
- fix tests to work in gitlab-ci
- fix tests to work in parallel
- add some examples

## Changelog

> Format according to https://keepachangelog.com

### v0.9.4
##### Fixed
- `service check` no more checks for ports given as `CONTAINER` part of a port mapping (`HOST:CONTAINER`)

### v0.9.3
#### Added
- validation of custom service definitions

#### Fixed
- vulnerabilites due to used packages

### v0.9.2
#### Fixed
- bug with mismatching PIDs

### v0.9.1
#### Fixed
- adjust node requirements

### v0.9.0
#### Added
- display warning if other dev-service instances are running

#### Changed
- migrate to ESM (due to package requirements)

#### Fixed
- don’t observe own ports in port check.

#### Removed
- support for node 10 (due to migration to ESM)

### v0.8.1
#### Fixed
- avoiding errors when projectname contains certain special characters

### v0.8.0
#### Added
- tests for `service check`

#### Changed
- `service start` checks for used ports before starting any service(s)
- updating list of provided services in readme

### v0.7.1
#### Fixed
- fixing further false positives `service check`
- package upgrades

### v0.7.0
#### Changed
- refactoring `service check` to avoid false positives

### v0.6.2
#### Fixed
- avoiding side effects between different dev repos

### v0.6.1
#### Fixed
- making tests work again after change in docker client api

### v0.6.0
#### Added
- new service: `elasticsearch`
- new service: `rabbitmq`

### v0.5.0
#### Added
- new `service check` to find processes blocking required ports

### v0.4.0
#### Added
- optional service customization

### v0.3.0
#### Added
- new `service restart` command

#### Changed
- expanding `service start`, `service stop` and `service logs` by optional `[service]` parameter

### v0.2.2
#### Fixed
- package upgrades

### v0.2.1
#### Fixed
- typo in readme

### v0.2.0
#### Added
- new `service logs` command

### v0.1.1
#### changed
- configure git ignore services/.compose folder

### v0.1.0
#### Added
- initial version with basic commands

---

## License

Licensed under [MIT](./LICENSE).

Published, Supported and Sponsored by [u|screen](https://uscreen.de)
