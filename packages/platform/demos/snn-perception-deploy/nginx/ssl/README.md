# SSL Certificate Setup

This directory contains SSL certificates for HTTPS support.

## Development/Testing (Self-Signed Certificate)

Generate a self-signed certificate for local testing:

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout server.key \
  -out server.crt \
  -subj "/C=US/ST=California/L=SanFrancisco/O=HoloLand/CN=localhost"
```

## Production (Let's Encrypt)

For production deployments, use Let's Encrypt with certbot:

```bash
# Install certbot
apt-get update
apt-get install certbot python3-certbot-nginx

# Obtain certificate
certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal is handled by certbot systemd timer
systemctl status certbot.timer
```

Certificates will be placed in `/etc/letsencrypt/live/your-domain.com/`.

Update `nginx/default.conf` to point to these certificates:

```nginx
ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
```

## Required Files

- `server.crt` - SSL certificate
- `server.key` - Private key

**IMPORTANT**: Never commit `server.key` to version control. Add to `.gitignore`.
