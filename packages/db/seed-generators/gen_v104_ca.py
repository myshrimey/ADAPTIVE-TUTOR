# v104: Computer Applications questions aligned to the CBSE Class 10 (code 165) 2026-27 syllabus units: Networking, HTML, Cyber Ethics.
# Syllabus read from public syllabus summaries (see docs/CONTENT_V104.md). Questions are original.
import json, os
from v104_lib import mcq, short, write
HERE = os.path.dirname(os.path.abspath(__file__)); SEED = os.path.join(HERE, '..', 'seed')
Q = []
A = Q.append

# ---------------- Unit 1: Networking ----------------
s = 'ca-internet-basics'
A(mcq(s,1,'Which of these is a program used on a client computer to view web pages?','A web browser',['A web server','A search index','A router'],'A browser (such as Chrome or Firefox) requests pages and shows them. A web server is the computer that stores and sends the pages.','TERMINOLOGY_CONFUSION'))
A(mcq(s,2,'A collection of related web pages stored under one domain name is called a:','Website',['Web page','Browser','Web server'],'A web page is a single document; a website is a set of linked web pages under one address.','TERMINOLOGY_CONFUSION'))
A(mcq(s,2,'Sending a file from your computer to a computer on the Internet is called:','Uploading',['Downloading','Browsing','Streaming'],'Uploading sends a file to a remote computer; downloading brings a file from a remote computer to yours.'))
A(mcq(s,3,'Which statement about the Internet and the World Wide Web is correct?','The Web is a service that runs on the Internet',['The Internet and the Web mean exactly the same thing','The Internet runs on top of the Web','The Web is a type of web browser'],'The Internet is the global network of networks. The World Wide Web is one service (linked pages) that uses it; email is another.','CONCEPT_CONFUSION'))

s = 'ca-internet-protocols'
A(mcq(s,1,'Which protocol is used to send email from a mail client to a mail server?','SMTP',['POP3','FTP','HTTP'],'SMTP (Simple Mail Transfer Protocol) sends outgoing mail. POP3 is used to fetch mail.','TERMINOLOGY_CONFUSION'))
A(mcq(s,2,'Which protocol is used to download your incoming email from a mail server to your device?','POP3',['SMTP','HTTPS','SCP'],'POP3 (Post Office Protocol version 3) retrieves mail from the server. SMTP only sends.','TERMINOLOGY_CONFUSION'))
A(mcq(s,2,'What is the main difference between HTTP and HTTPS?','HTTPS encrypts the data sent between browser and server',['HTTPS is faster because it skips the server','HTTP is used only for email','HTTPS works only on mobile phones'],'The S in HTTPS stands for Secure: data is encrypted, so others on the network cannot read it easily.'))
A(mcq(s,3,'In the TCP/IP pair of protocols, which job does TCP do?','Breaks data into packets and makes sure they arrive and are put back in order',['Gives every website a colour','Converts email into video','Stores web pages permanently'],'TCP handles reliable delivery of packets; IP handles addressing and routing them.','CONCEPT_CONFUSION'))

s = 'ca-remote-file-transfer'
A(mcq(s,2,'Which tool lets you log in to a remote computer securely, with the session encrypted?','SSH',['TELNET','FTP','SMTP'],'SSH encrypts the whole session. TELNET also gives remote login but sends everything, including passwords, as plain text.','TERMINOLOGY_CONFUSION'))
A(mcq(s,2,'Why is TELNET considered unsafe on open networks?','It sends data, including passwords, without encryption',['It can only work offline','It deletes files after use','It needs a printer'],'Anyone watching the network could read what TELNET sends; SSH was designed to fix this.'))
A(mcq(s,2,'The protocol whose job is to move files between computers is:','FTP',['SMTP','POP3','HTTP'],'FTP (File Transfer Protocol) uploads and downloads files. SFTP and SCP do the same but securely.','TERMINOLOGY_CONFUSION'))
A(mcq(s,3,'Which pair contains two SECURE ways to transfer files?','SFTP and SCP',['FTP and TELNET','SMTP and POP3','HTTP and FTP'],'SFTP and SCP both work over SSH, so the data is encrypted. Plain FTP and TELNET are not encrypted.','CONCEPT_CONFUSION'))

s = 'ca-internet-services'
A(mcq(s,1,'A program that helps you find web pages by typing keywords is called a:','Search engine',['Compiler','Spreadsheet','Operating system'],'Search engines such as Google or Bing look through an index of web pages and list matches.'))
A(mcq(s,2,'Paying an electricity bill through a mobile banking app is an example of:','e-Banking',['e-Learning','e-Governance','Video conferencing'],'e-Banking means doing bank work (transfers, bills) over the Internet.','TERMINOLOGY_CONFUSION'))
A(mcq(s,2,'Applying for a certificate on a government website instead of visiting the office is an example of:','e-Governance',['e-Shopping','Chat','Blogging'],'e-Governance uses the Internet to deliver government services to citizens.','TERMINOLOGY_CONFUSION'))
A(mcq(s,2,'Attending a live class with several students at different places on one screen is an example of:','Video conferencing',['e-Shopping','Downloading','A newsgroup'],'Video conferencing lets people in different places see and hear each other in real time.'))

s = 'ca-mobile-technologies'
A(mcq(s,1,'What does SMS stand for?','Short Message Service',['Secure Mail System','Simple Media Stream','Smart Mobile Signal'],'SMS carries short text messages between mobile phones.','TERMINOLOGY_CONFUSION'))
A(mcq(s,2,'Which service can carry pictures, audio or video in a message, not only text?','MMS',['SMS','POP3','SSH'],'MMS (Multimedia Messaging Service) extends SMS to send media files.','TERMINOLOGY_CONFUSION'))
A(mcq(s,2,'Compared with 4G, 5G mobile networks are designed to give:','Faster speeds and lower delay',['Slower speeds but longer battery','Only voice calls','Text messages only'],'Each generation improved on the last; 5G aims for higher speed and lower latency than 4G.'))
A(mcq(s,3,'Which mobile technology first made video calling and mobile Internet practical for many phone users?','3G',['1G','2G voice only','Bluetooth'],'1G was analogue voice and 2G added digital calls and SMS. 3G brought mobile data fast enough for video calls and browsing.','CONCEPT_CONFUSION'))

# ---------------- Unit 2: HTML ----------------
s = 'ca-html-body-attributes'
A(mcq(s,1,'Which tag contains the text shown in the browser tab (title bar)?','<title>',['<body>','<h1>','<br>'],'<title> sits inside <head>. Its text appears on the browser tab, not on the page itself.'))
A(mcq(s,2,'Which attribute of the <body> tag sets the background colour of the page?','bgcolor',['text','link','href'],'bgcolor sets the page colour. text sets the colour of normal text and link sets the colour of links.','TERMINOLOGY_CONFUSION'))
A(mcq(s,2,'What does <body text="blue"> do?','Makes the normal text on the page blue',['Makes the background blue','Makes only links blue','Adds the word blue to the page'],'The text attribute colours ordinary text. It does not change the background.'))
A(mcq(s,3,'Which is the correct basic order of a web page?','<html> contains <head> and then <body>',['<body> contains <html> and then <head>','<head> contains <html> and <body>','<title> contains <body> and <head>'],'<html> is the outer element; <head> comes first, then <body>.','PROCEDURAL_ERROR'))
A(mcq(s,2,'In <body background="sky.jpg">, what is sky.jpg used as?','A background picture for the page',['The page title','The text of a link','A sound played on loading'],'The background attribute takes the name of an image file to tile behind the page.'))

s = 'ca-html-formatting-tags'
A(mcq(s,1,'Which tag inserts a line break?','<br>',['<hr>','<p>','<h1>'],'<br> breaks the line without starting a new paragraph. <hr> draws a horizontal line.','TERMINOLOGY_CONFUSION'))
A(mcq(s,1,'Which tag draws a horizontal line across the page?','<hr>',['<br>','<u>','<i>'],'hr stands for horizontal rule.','TERMINOLOGY_CONFUSION'))
A(mcq(s,2,'Which heading tag gives the LARGEST heading by default?','<h1>',['<h6>','<h3>','<p>'],'<h1> is the biggest and <h6> the smallest heading.'))
A(mcq(s,2,'Which tag makes text italic?','<i>',['<b>','<u>','<hr>'],'<i> italic, <b> bold, <u> underline.','TERMINOLOGY_CONFUSION'))
A(mcq(s,3,'Which of these tags does NOT need a closing tag?','<br>',['<p>','<b>','<h2>'],'<br> and <hr> are empty tags: they have no content, so there is nothing to close.','CONCEPT_CONFUSION'))

s = 'ca-html-lists'
A(mcq(s,1,'Which tag creates a bulleted (unordered) list?','<ul>',['<ol>','<dl>','<li>'],'<ul> is unordered (bullets), <ol> is ordered (numbers). <li> is each item inside either list.','TERMINOLOGY_CONFUSION'))
A(mcq(s,2,'What does <ol start="5"> do?','The numbering begins at 5',['The list has only 5 items','The list is shown 5 times','The list is hidden after item 5'],'start sets the first number of an ordered list.'))
A(mcq(s,2,'Which code makes an ordered list with lowercase letters (a, b, c)?','<ol type="a">',['<ul type="a">','<ol start="a">','<dl type="a">'],'type="a" on <ol> gives a, b, c. Use type="A" for capital letters.','PROCEDURAL_ERROR'))
A(mcq(s,3,'In a description list, which tag holds the TERM being described?','<dt>',['<dd>','<li>','<dl>'],'<dl> is the list, <dt> the term, <dd> its description.','TERMINOLOGY_CONFUSION'))
A(mcq(s,3,'Which attribute changes the bullet style of an unordered list to squares?','type="square"',['start="square"','style="ol"','bullet="2"'],'type on <ul> can be disc, circle or square.','PROCEDURAL_ERROR'))

s = 'ca-html-images-media'
A(mcq(s,1,'Which attribute of <img> gives the file name or address of the picture?','src',['alt','href','width'],'src (source) says where the image file is.','TERMINOLOGY_CONFUSION'))
A(mcq(s,2,'What is the main purpose of the alt attribute on an image?','Gives replacement text if the image cannot be shown, and helps screen readers',['Sets the image size','Links the image to another page','Plays a sound'],'alt text is shown when the image fails to load and is read aloud for visually impaired users.'))
A(mcq(s,2,'Which pair of attributes sets the size of an image?','width and height',['src and alt','href and target','bgcolor and text'],'width and height take values in pixels (or percent).','TERMINOLOGY_CONFUSION'))
A(mcq(s,3,'Which tag is used to add a sound file to a page with play controls?','<audio controls>',['<img controls>','<sound play>','<song>'],'<audio> embeds sound; the controls attribute shows play/pause buttons.','PROCEDURAL_ERROR'))
A(mcq(s,3,'Which tag embeds a video player in a web page?','<video>',['<movie>','<img>','<clip>'],'<video> (often with controls) is the HTML tag for video.','TERMINOLOGY_CONFUSION'))

s = 'ca-html-tables'
A(mcq(s,1,'Which tag defines a table row?','<tr>',['<td>','<th>','<table>'],'tr = table row, td = data cell, th = header cell.','TERMINOLOGY_CONFUSION'))
A(mcq(s,2,'Which tag creates a header cell that is bold and centred by default?','<th>',['<td>','<tr>','<tb>'],'<th> is a table header cell; <td> is an ordinary data cell.'))
A(mcq(s,2,'A cell that must stretch across 3 columns should use:','colspan="3"',['rowspan="3"','span="col3"','width="3"'],'colspan merges cells across columns; rowspan merges cells down rows.','CONCEPT_CONFUSION'))
A(mcq(s,3,'A cell that must stretch down 2 rows should use:','rowspan="2"',['colspan="2"','cellspan="2"','height="2"'],'rowspan merges cells vertically across rows.','CONCEPT_CONFUSION'))
A(mcq(s,3,'In a table written with 3 <tr> rows, each having 4 <td> cells and no merging, how many cells does the table show?','12',['7','3','4'],'3 rows x 4 cells = 12 cells.','INCOMPLETE_REASONING'))

s = 'ca-html-forms'
A(mcq(s,1,'Which input type hides what the user types, showing dots or stars instead?','password',['text','radio','checkbox'],'type="password" masks the characters.','TERMINOLOGY_CONFUSION'))
A(mcq(s,2,'Which control should be used when the user may pick ONLY ONE option from a group?','Radio button',['Checkbox','Password box','Text box'],'Radio buttons with the same name allow just one choice. Checkboxes allow several.','CONCEPT_CONFUSION'))
A(mcq(s,2,'Which control should be used when the user may tick MORE THAN ONE option, such as hobbies?','Checkbox',['Radio button','Password box','Submit button'],'Checkboxes are independent, so several can be ticked.','CONCEPT_CONFUSION'))
A(mcq(s,3,'For radio buttons to behave as one group, what must they share?','The same name attribute',['The same value attribute','The same colour','The same width'],'Radio buttons with the same name belong to one group, so selecting one clears the others.','CONCEPT_CONFUSION'))
A(mcq(s,3,'Which tag with <option> items makes a drop-down list in a form?','<select>',['<input type="list">','<ul>','<dropdown>'],'<select> holds <option> items and shows them as a drop-down list.','PROCEDURAL_ERROR'))

s = 'ca-html-links'
A(mcq(s,1,'Which attribute of <a> gives the address the link goes to?','href',['src','alt','name'],'href (hypertext reference) holds the target address.','TERMINOLOGY_CONFUSION'))
A(mcq(s,2,'Which link opens the visitor\'s email program to write to a given address?','<a href="mailto:help@example.com">',['<a href="email:help@example.com">','<a mail="help@example.com">','<a src="help@example.com">'],'mailto: in the href starts a new email to that address.','PROCEDURAL_ERROR'))
A(mcq(s,2,'What does target="_blank" do on a link?','Opens the page in a new tab or window',['Closes the current page','Makes the link text blank','Downloads the page'],'_blank loads the destination in a new browsing context.'))
A(mcq(s,3,'In <a href="notes.html">Click here</a>, what does the visitor see on the page?','The words Click here as the link',['notes.html','The tag <a>','Nothing'],'The text between the opening and closing <a> tags is what is shown and clicked.','INCOMPLETE_REASONING'))

s = 'ca-css-basics'
A(mcq(s,1,'What does CSS stand for?','Cascading Style Sheets',['Computer Style System','Colour and Shape Syntax','Coded Server Script'],'CSS describes how HTML elements look: colour, spacing, fonts and so on.','TERMINOLOGY_CONFUSION'))
A(mcq(s,2,'Which CSS property sets the colour of text?','color',['background','margin','border'],'color sets text colour; background sets the background.','TERMINOLOGY_CONFUSION'))
A(mcq(s,2,'Which is a correct CSS rule?','p { color: red; }',['p ( color = red )','p { color - red }','<p color: red>'],'A rule has a selector, then braces, then property: value; pairs.','PROCEDURAL_ERROR'))
A(mcq(s,3,'Which CSS property puts empty space OUTSIDE the border of an element?','margin',['padding','color','font-size'],'margin is outside the border; padding is inside it.','CONCEPT_CONFUSION'))
A(mcq(s,3,'Which attribute lets you write CSS directly inside one HTML tag?','style',['class','src','href'],'style="color:blue;" applies CSS to just that element (inline style).'))

# ---------------- Unit 3: Cyber Ethics ----------------
s = 'ca-netiquette'
A(mcq(s,1,'Writing a whole message in CAPITAL LETTERS online is usually seen as:','Shouting, which is bad netiquette',['Polite and clear','Required by law','A way to encrypt the message'],'Netiquette asks us to keep a normal tone; capitals feel like shouting.'))
A(mcq(s,2,'Which is good netiquette in an online class chat?','Wait for your turn and write respectfully',['Post the same message again and again','Send jokes about classmates','Share a classmate\'s photo without asking'],'Respect, patience and privacy are the heart of netiquette.'))
A(mcq(s,2,'Sending unwanted bulk messages or advertisements to many people is called:','Spamming',['Browsing','Tagging','Streaming'],'Spam wastes people\'s time and can carry scams or malware.','TERMINOLOGY_CONFUSION'))
A(mcq(s,3,'Before posting a group photo of your friends online, the best netiquette is to:','Ask them for permission first',['Post it, since you took the photo','Tag everyone so they cannot object','Delete it only if someone complains in court'],'Photos show other people, so their consent and privacy matter, even if you hold the copyright.','INCOMPLETE_REASONING'))

s = 'ca-software-licensing'
A(mcq(s,1,'Software whose source code is available for anyone to see, change and share (under its licence) is called:','Open-source software',['Proprietary software','Malware','Hardware'],'Examples include Linux, LibreOffice and Mozilla Firefox.','TERMINOLOGY_CONFUSION'))
A(mcq(s,2,'Which of these is usually proprietary software?','Microsoft Windows',['Linux','LibreOffice','Mozilla Firefox'],'Proprietary software is owned by a company which keeps the source code private and controls how it is used.'))
A(mcq(s,2,'What usually happens to proprietary software if you copy and share it with friends without permission?','It breaks the licence and may be illegal',['Nothing, copying is always allowed','The software improves','It becomes open source'],'A licence lists what you may do. Unauthorised copying (piracy) breaks it.'))
A(mcq(s,3,'Which statement is correct?','Open source does not always mean free of cost',['Open source software cannot be used by companies','All free software is open source','Open source means the code is secret'],'Open source is about access to the code and freedom to change it. Some open-source products are sold with support or services.','CONCEPT_CONFUSION'))

s = 'ca-ipr-plagiarism'
A(mcq(s,1,'Presenting someone else\'s work as your own without giving credit is called:','Plagiarism',['Netiquette','Encryption','Downloading'],'Plagiarism is a form of dishonesty and can break copyright law.','TERMINOLOGY_CONFUSION'))
A(mcq(s,2,'Which is the honest way to use a paragraph from a website in your project?','Put it in quotation marks and name the source',['Copy it and delete the website name','Change two words and claim it as yours','Use it without saying anything'],'Quoting with credit, or paraphrasing with credit, avoids plagiarism.'))
A(mcq(s,2,'Which of these is protected by copyright?','A song you can hear online',['The idea of writing a song, with nothing written down','A fact such as 2 + 2 = 4','The name of a day, such as Monday'],'Copyright protects the original expression of a work (the song itself), not bare ideas or common facts.','CONCEPT_CONFUSION'))
A(mcq(s,3,'Why are Intellectual Property Rights (IPR) given to creators?','So creators can control and benefit from their original work',['So that nobody can read the work','So that the work is always free','So that only companies can create'],'IPR encourage people to create by giving them legal protection over their work.'))

s = 'ca-ecommerce-security'
A(mcq(s,1,'Which sign in the browser suggests that a website connection is secure?','A padlock with https in the address',['A bright banner','Many pop-ups','A free-gift offer'],'HTTPS and the padlock show that the connection is encrypted. It does not prove the shop itself is honest.'))
A(mcq(s,2,'You get a call asking for the OTP of your card "to cancel a wrong payment". What should you do?','Never share it; hang up and contact the bank through its official number',['Share it quickly','Share half of it','Share it only if the caller sounds polite'],'Banks never ask for OTPs. Sharing it lets a fraudster complete a payment.','PROCEDURAL_ERROR'))
A(mcq(s,2,'Tricking people into giving passwords or card details through a fake message or website is called:','Phishing',['Streaming','Compiling','Zooming'],'Phishing messages look genuine; check the sender and web address before clicking.','TERMINOLOGY_CONFUSION'))
A(mcq(s,3,'Why is data converted into a coded form (encryption) when you pay online?','So that anyone who intercepts it cannot read it',['So that it uses less electricity','So that the page loads in colour','So that the shop can sell it'],'Encryption protects card and personal details while travelling over the network.'))

write(os.path.join(SEED, 'cbse-class10-computer-applications-v104-diagnostic.json'), 'computer-applications', Q)
