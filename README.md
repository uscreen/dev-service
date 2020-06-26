# dev-service

> Manage services for local development

## Prerequisites

- a local or remote docker host
- a docker client connected to that host
- `docker` and `docker-compose` located in your `$PATH`
- `node` v8.12, v10.13, v12.0 or higher

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

Show logs of given or running services (abort with Ctrl-C).

## Provided services

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

This action has following features & caveats:

- The service's name is automatically derived from the service's image name
- An adequate `container_name` is automatically added and will overwrite any existing container name
- Volumes can only be given in "short syntax"
- All specified named volumes are automatically created if not already existing

### Mapping host paths

If you want to map data from your host into a volume, it is best practice to put this data into a subfolder of the `services` folder, named after the service it's mapped to. Also, you should use a relative path inside your service definition. A good example for this is the provided nginx service. If we would define it inside of our package.json, it would look like this:

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

- adding tests for `service logs [servicename]`
- adding tests for service customization
- making tests work in gitlab-ci
- making tests work in parallel

## Changelog

### v0.4.0

- adding service customization

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
