import { BadRequestException } from '@nestjs/common';
import { promises as dns } from 'dns';
import { isIP } from 'net';

const PRIVATE_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  'instance-data',
  '169.254.169.254',
  'metadata',
]);

const PRIVATE_HOSTNAME_RE = /\.(internal|local|lan|home|corp|intranet)$/i;

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false;
  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  return (
    lower === '::1' ||
    lower === '::' ||
    lower.startsWith('fc') ||
    lower.startsWith('fd') ||
    lower.startsWith('fe80') ||
    lower.startsWith('::ffff:127.') ||
    lower.startsWith('::ffff:10.') ||
    lower.startsWith('::ffff:192.168') ||
    lower.startsWith('::ffff:169.254')
  );
}

export function isPrivateIp(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) return isPrivateIpv4(ip);
  if (v === 6) return isPrivateIpv6(ip);
  return true; // unparseable → treat as unsafe
}

export function isPrivateHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, '');
  if (PRIVATE_HOSTNAMES.has(h) || PRIVATE_HOSTNAME_RE.test(h)) return true;
  if (isIP(h)) return isPrivateIp(h);
  return false;
}

/**
 * Validates that a user-supplied URL is safe to fetch server-side:
 * http(s) only, no private/loopback/link-local hostnames or resolved IPs.
 * Throws BadRequestException on violation.
 */
export async function assertPublicHttpUrl(rawUrl: string, fieldName = 'url'): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new BadRequestException(`Invalid ${fieldName}`);
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new BadRequestException(`${fieldName} must be http(s)`);
  }

  const hostname = url.hostname.toLowerCase();
  if (isPrivateHostname(hostname)) {
    throw new BadRequestException(`${fieldName} points to a private/internal address`);
  }

  // DNS resolution check — skipped under Jest so unit tests don't need network.
  if (process.env.NODE_ENV !== 'test') {
    try {
      const { address } = await dns.lookup(hostname);
      if (isPrivateIp(address)) {
        throw new BadRequestException(`${fieldName} resolves to a private/internal address`);
      }
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(`${fieldName} hostname cannot be resolved`);
    }
  }

  return url;
}
