# v104: adds the official 2026-27 syllabus units (Networking, HTML, Cyber Ethics) to the Computer Applications curriculum. Additive and re-runnable.
import json, os
P = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'seed', 'cbse-class10-computer-applications.json')
j = json.load(open(P, encoding='utf-8'))
def sk(name, slug): return {'name': name, 'slug': slug, 'requires': []}
def tp(name, slug, seq, skills): return {'name': name, 'slug': slug, 'sequence': seq, 'topics_skills': skills}
NEW = [
 ('Unit 1 Networking: Internet, Protocols and Services (syllabus 2026-27)', 'syl-networking', 9, [
   ('Internet Basics', 'syl-internet-basics', [sk('Identify web and Internet terms: browser, server, website, uploading, downloading', 'ca-internet-basics')]),
   ('Internet Protocols', 'syl-internet-protocols', [sk('Match protocols (TCP/IP, SMTP, POP3, HTTP, HTTPS) to their jobs', 'ca-internet-protocols'), sk('Distinguish remote login and file transfer tools (SSH, TELNET, FTP, SFTP, SCP)', 'ca-remote-file-transfer')]),
   ('Internet Services and Mobile Technologies', 'syl-internet-services', [sk('Identify Internet services: search engines, e-Banking, e-Governance, video conferencing', 'ca-internet-services'), sk('Explain SMS, MMS and 3G/4G/5G mobile technologies', 'ca-mobile-technologies')])]),
 ('Unit 2 HTML: Pages, Lists, Media, Tables, Forms and CSS (syllabus 2026-27)', 'syl-html', 10, [
   ('Page Structure and Formatting', 'syl-html-structure', [sk('Use the body attributes and title of an HTML page', 'ca-html-body-attributes'), sk('Apply line break, rule, heading, paragraph and text style tags', 'ca-html-formatting-tags')]),
   ('Lists', 'syl-html-lists', [sk('Build ordered, unordered and description lists with start and type', 'ca-html-lists')]),
   ('Images, Audio, Video and Tables', 'syl-html-media-tables', [sk('Insert images, audio and video with the right attributes', 'ca-html-images-media'), sk('Build tables with rows, headers, rowspan and colspan', 'ca-html-tables')]),
   ('Forms, Links and CSS', 'syl-html-forms-css', [sk('Choose the right form control (text, password, radio, checkbox, list)', 'ca-html-forms'), sk('Write links with href, mailto and target', 'ca-html-links'), sk('Write basic CSS for colour, background, border, margin and font', 'ca-css-basics')])]),
 ('Unit 3 Cyber Ethics (syllabus 2026-27)', 'syl-cyber-ethics', 11, [
   ('Netiquette and Licensing', 'syl-netiquette-licensing', [sk('Apply netiquette in online communication', 'ca-netiquette'), sk('Distinguish open-source and proprietary software licences', 'ca-software-licensing')]),
   ('Intellectual Property and E-commerce Security', 'syl-ipr-security', [sk('Explain plagiarism and intellectual property rights', 'ca-ipr-plagiarism'), sk('Apply safe practices for e-commerce, privacy and secure data transmission', 'ca-ecommerce-security')])]),
]
have = {c['slug'] for c in j['chapters']}
for name, slug, seq, topics in NEW:
    if slug in have: continue
    j['chapters'].append({'name': name, 'slug': slug, 'sequence': seq,
        'topics': [{'name': tn, 'slug': ts, 'sequence': i + 1, 'skills': skl} for i, (tn, ts, skl) in enumerate(topics)]})
json.dump(j, open(P, 'w', encoding='utf-8'), ensure_ascii=False, indent=2); open(P, 'a').write('\n')
print('chapters', len(j['chapters']), 'skills', sum(len(t['skills']) for c in j['chapters'] for t in c['topics']))
