#!/usr/bin/env python3
"""
FMHY Wiki Markdown to Userscript JSON Converter
==============================================
Downloads FMHY wiki docs in-memory and converts starred recommendations into a clean JSON list.
"""

import os
import re
import io
import json
import argparse
import urllib.request
import zipfile
from urllib.parse import urlparse

DEFAULT_REPO_ZIP = "https://github.com/fmhy/edit/archive/refs/heads/main.zip"
DEFAULT_EXCLUDED_FILES = ["index.md", "posts.md", "sandbox.md", "startpage.md", "README.md"]

# Custom user domains (Supports wildcards like "*.domain.com", raw domains, or full URLs)
USER_LIKED = [
    "https://www.wikipedia.org/"
]

USER_DISLIKED = [
    "indiatvnews.com",
    "news18.com",
    "opindia.com",
    "opinida.com",
    "quora.com",
    "swarajyamag.com",
    "republicworld.com",
    "india.com",
    "infowars.com",
    "thegatewaypundit.com",
    "palmerreport.com",
    "breitbart.com",
    "dailywire.com",
    "dailykos.com",
    "foxnews.com",
    "rt.com",
    "kcna.kp",
    "cgtn.com",
    "trtworld.com",
    "naturalnews.com",
    "mercola.com",
    "climatedepot.com",
    "omicsonline.org",
    "waset.org",
    "jpands.org",
    "answersresearchjournal.org",
    "beallslist.net",
    "jetir.org",
    "ijcrt.org",
    "gisscience.net",
    "rockartweb.com",
    "unipune.ac.in",
    "ayush.gov.in",
    "vibhaindia.org",
    "rss.org",
    "pump.fun"
]

COMMON_EXCLUDED_DOMAINS = {
    'github.com', 'github.io', 'reddit.com', 'discord.gg', 'discord.com',
    't.me', 'telegram.org', 'youtube.com', 'youtu.be', 'wikipedia.org',
    'twitter.com', 'x.com', 'facebook.com', 'google.com', 'rentry.org',
    'rentry.co', 'archive.org', 'gitlab.com', 'medium.com', 'imgur.com',
    'virustotal.com', 'tria.ge', 'clarasguide.valeena.workers.dev',
    'counterfeits.revanced.app', 'ibb.co', 'gist.github.com',
    'githubusercontent.com', 'googleusercontent.com', 'blogspot.com',
    'wordpress.com', 'workers.dev', 'pages.dev', 'vercel.app', 'github.dev'
}

def extract_domain(url):
    """Extracts the bare base domain from a URL, stripping protocols, query parameters, and subdomains."""
    try:
        parsed = urlparse(url.strip('[]() \t'))
        netloc = parsed.netloc or parsed.path
        if '/' in netloc: netloc = netloc.split('/')[0]
        if '@' in netloc: netloc = netloc.split('@')[-1]
        if ':' in netloc: netloc = netloc.split(':')[0]
        netloc = netloc.lower().strip()
        if netloc.startswith('www.'): netloc = netloc[4:]
        return netloc.strip('.') if netloc else None
    except Exception:
        return None

def normalize_user_domain(item):
    """Clean and normalize user-defined domains, preserving wildcard (*.) notation if present."""
    item = item.strip().lower()
    is_wildcard = item.startswith('*.')
    if is_wildcard:
        item = item[2:]
    domain = extract_domain(item)
    if domain:
        return f"*.{domain}" if is_wildcard else domain
    return None

def is_excluded(domain):
    """Checks if a domain or its parent domains are in the exclusion list."""
    if not domain or domain in COMMON_EXCLUDED_DOMAINS: return True
    parts = domain.split('.')
    for i in range(1, len(parts)):
        if '.'.join(parts[i:]) in COMMON_EXCLUDED_DOMAINS: return True
    return False

def get_registerable_domain(domain):
    """Returns the registerable (root) domain, handling multi-part suffixes like co.uk."""
    if not domain:
        return ""
    clean = domain.lower().strip()
    if clean.startswith('*.'):
        clean = clean[2:]
    parts = clean.split('.')
    if len(parts) <= 2:
        return clean
    
    tld = parts[-1]
    sld = parts[-2]
    
    is_cc_tld = (len(tld) == 2)
    is_common_sld = re.match(r'^(co|com|org|net|gov|edu|ac|or|ne|ltd|plc|sch|asn)$', sld) is not None
    
    if is_cc_tld and is_common_sld and len(parts) >= 3:
        return '.'.join(parts[-3:])
    return '.'.join(parts[-2:])

def consolidate_to_wildcards(domains_set, threshold=3):
    """Consolidates subdomains into wildcards if a registerable domain has >= threshold subdomains."""
    groups = {}
    for d in domains_set:
        root = get_registerable_domain(d)
        if root:
            if root not in groups:
                groups[root] = []
            groups[root].append(d)
            
    consolidated = set()
    for root, subdomains in groups.items():
        if len(subdomains) >= threshold:
            consolidated.add(f"*.{root}")
        else:
            for s in subdomains:
                consolidated.add(s)
    return consolidated

def extract_starred_domains_from_text(content):
    """Scans lines containing the star emoji (⭐) for markdown links and extracts domains."""
    domains = set()
    for line in content.splitlines():
        if '⭐' in line:
            urls = re.findall(r'\[[^\]]+\]\(((?:https?://|//)[^)]+)\)', line)
            for url in urls:
                domain = extract_domain(url)
                if domain and not is_excluded(domain) and '.' in domain and len(domain) >= 4:
                    domains.add(domain)
    return domains

def extract_domains_from_docs(docs_dir, exclude):
    """Scans all non-excluded markdown files in a local directory for starred links and extracts unique domains."""
    liked = set()
    files = sorted([f for f in os.listdir(docs_dir) if f.endswith('.md') and f not in exclude and f != 'unsafe.md'])
    
    for filename in files:
        path = os.path.join(docs_dir, filename)
        try:
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            liked.update(extract_starred_domains_from_text(content))
        except Exception as e:
            print(f"Error reading {filename}: {e}")
    return liked

def extract_domains_from_zip(zip_url, exclude):
    """Downloads the repo ZIP and extracts unique starred domains in memory without writing to disk."""
    print(f"Downloading FMHY repo zip from {zip_url}...")
    liked = set()
    try:
        req = urllib.request.Request(zip_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as resp:
            zip_data = resp.read()
        
        with zipfile.ZipFile(io.BytesIO(zip_data)) as z:
            # Find the docs prefix in ZIP, e.g., 'edit-main/docs/'
            docs_prefix = None
            for name in z.namelist():
                if name.endswith('/docs/'):
                    docs_prefix = name
                    break
            if not docs_prefix:
                for name in z.namelist():
                    idx = name.find('/docs/')
                    if idx != -1:
                        docs_prefix = name[:idx + 6]
                        break
            
            if not docs_prefix:
                print("Error: Could not find docs/ directory in ZIP.")
                return liked
            
            print(f"Parsing files from ZIP: {docs_prefix}")
            for name in z.namelist():
                if name.startswith(docs_prefix) and name.endswith('.md'):
                    filename = name[len(docs_prefix):]
                    if '/' not in filename and filename not in exclude and filename != 'unsafe.md':
                        try:
                            content = z.read(name).decode('utf-8')
                            liked.update(extract_starred_domains_from_text(content))
                        except Exception as e:
                            print(f"Error parsing ZIP file {name}: {e}")
    except Exception as e:
        print(f"Error downloading or parsing ZIP: {e}")
    return liked

def fetch_filterlist():
    """Downloads the official FMHY Filterlist domains blocklist."""
    print("Downloading FMHY Filterlist domains...")
    disliked = set()
    try:
        req = urllib.request.Request(
            "https://raw.githubusercontent.com/fmhy/FMHYFilterlist/main/filterlist-domains.txt",
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        with urllib.request.urlopen(req) as resp:
            for line in resp.read().decode('utf-8').splitlines():
                line = line.strip()
                if line and not line.startswith('#'):
                    disliked.add(line)
        print(f"Loaded {len(disliked)} blocked domains.")
    except Exception as e:
        print(f"Warning: Failed to fetch filterlist-domains: {e}")
    return disliked

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    default_output = os.path.join(script_dir, "fmhy_domains.json")

    parser = argparse.ArgumentParser(description="Convert FMHY markdown docs to userscript JSON")
    parser.add_argument("--local-dir", help="Path to local docs directory")
    parser.add_argument("--output", default=default_output, help="Output JSON filepath")
    args = parser.parse_args()

    docs_dir = args.local_dir
    if docs_dir:
        liked = extract_domains_from_docs(docs_dir, DEFAULT_EXCLUDED_FILES)
    else:
        liked = extract_domains_from_zip(DEFAULT_REPO_ZIP, DEFAULT_EXCLUDED_FILES)

    disliked = fetch_filterlist()

    # Merge custom user domains
    for item in USER_LIKED:
        domain = normalize_user_domain(item)
        if domain:
            liked.add(domain)

    for item in USER_DISLIKED:
        domain = normalize_user_domain(item)
        if domain:
            disliked.add(domain)

    # Consolidate liked and disliked domains to wildcards (threshold of 3+ subdomains)
    liked = consolidate_to_wildcards(liked, threshold=3)
    disliked = consolidate_to_wildcards(disliked, threshold=3)

    # Ensure blocklist overrides whitelist (including wildcard-aware matching) using optimized set check
    disliked_clean = {d[2:] if d.startswith('*.') else d for d in disliked}
    liked_filtered = set()
    for l in liked:
        l_clean = l[2:] if l.startswith('*.') else l
        parts = l_clean.split('.')
        is_blocked = False
        for i in range(len(parts)):
            suffix = '.'.join(parts[i:])
            if suffix in disliked_clean:
                is_blocked = True
                break
        if not is_blocked:
            liked_filtered.add(l)
    liked = liked_filtered

    result = {
        "liked": sorted(list(liked)),
        "disliked": sorted(list(disliked))
    }

    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    
    total = len(liked) + len(disliked)
    print(f"Saved optimized JSON to {args.output} ({total} unique domains - {len(liked)} liked, {len(disliked)} disliked)")

if __name__ == '__main__':
    main()

