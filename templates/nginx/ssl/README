Add your ssl certificates here.

Or create some locally trusted with `mkcert` (https://mkcert.dev)

Domain + Subdomain:

```
mkcert -key-file key.pem -cert-file cert.pem example.com *.example.com
```

Or just localhost:

```
mkcert -key-file key.pem -cert-file cert.pem localhost
```

Should output

```
❯ mkcert -key-file key.pem -cert-file cert.pem localhost

Created a new certificate valid for the following names 📜
 - "localhost"

The certificate is at "cert.pem" and the key at "key.pem" ✅

It will expire on 10 August 2024 🗓
```

Now add them to your config:

```
server {
  listen 80;
  server_name localhost;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  server_name localhost;

  ssl_certificate ssl/cert.pem;
  ssl_certificate_key ssl/key.pem;
  # ...
}
```
