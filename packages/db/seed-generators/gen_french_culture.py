# v123: French culture-lesson, reading and writing questions (original, written for Sahayak; facts follow the Entre Jeunes Class X lessons 2-8 and 10).
import fr_lib as L
from fr_lib import mcq
Q = []
def V(skill, d, prompt, ok, wr, ex): Q.append(mcq(skill, d, prompt, ok, wr, ex, 'VOCABULARY_GAP'))
def C(skill, d, prompt, ok, wr, ex): Q.append(mcq(skill, d, prompt, ok, wr, ex, 'COMPREHENSION_GAP'))
def G(skill, d, prompt, ok, wr, ex): Q.append(mcq(skill, d, prompt, ok, wr, ex, 'GRAMMAR_RULE'))
def S(skill, d, prompt, ok, wr, ex): Q.append(mcq(skill, d, prompt, ok, wr, ex, 'STRUCTURE_FORMAT'))

# ---- Lesson 2
k='education-system-france-india'
V(k,1,"Quel est le diplôme qu'on passe à la fin du lycée en France ?","le baccalauréat",["le brevet","la licence","le permis"],"On passe le baccalauréat (le bac) à la fin du lycée.")
C(k,2,"Dans le système français, quel est l'ordre correct des écoles ?","maternelle puis primaire puis collège puis lycée",["primaire puis maternelle puis lycée puis collège","collège puis primaire puis maternelle puis lycée","lycée puis collège puis primaire puis maternelle"],"En France : l'école maternelle, l'école primaire, le collège, puis le lycée.")
C(k,2,"En France, un enfant de quatre ans va normalement à…","l'école maternelle",["au lycée","à l'université","au collège"],"L'école maternelle accueille les petits enfants.")
V(k,2,"Comment dit-on « school » pour les enfants de 6 à 11 ans en France ?","l'école primaire",["le lycée","la maternelle","l'université"],"L'école primaire est pour les enfants d'environ 6 à 11 ans.")
C(k,3,"À quel âge l'école cesse-t-elle d'être obligatoire en France, selon la leçon ?","à 16 ans",["à 10 ans","à 14 ans","à 21 ans"],"En France, l'école est obligatoire jusqu'à 16 ans.")
k='studies-after-the-bac'
V(k,1,"Que signifie « une bourse » pour un étudiant ?","une aide financière pour les études",["un sac pour les livres","une chambre à l'université","un examen d'entrée"],"Une bourse = scholarship.")
V(k,2,"IUT veut dire…","Institut universitaire de technologie",["Institut unique de travail","Institution universelle de théâtre","Institut urbain de transports"],"L'IUT propose des formations courtes et pratiques après le bac.")
C(k,2,"Après le bac, un étudiant peut aller…","à l'université ou dans un IUT",["à l'école maternelle","à l'école primaire","au collège"],"Après le bac, on choisit l'université, un IUT ou une autre formation.")
V(k,2,"Quel mot désigne l'examen qu'on passe à la fin du lycée ?","le bac",["le CV","la bourse","l'intérim"],"Le bac est l'abréviation de baccalauréat.")
V(k,3,"Quelle phrase est correcte ?","Elle fait ses études de droit à l'université.",["Elle fait ses études à droit de l'université.","Elle fait droit études à l'université.","Elle est ses études de droit à l'université."],"Faire ses études de + matière.")
k='verb-noun-forms'
for v,n,d in [('arriver','une arrivée',1),('sortir','une sortie',1),('partir','un départ',2),('acheter','un achat',2),('consommer','une consommation',3),('encourager','un encouragement',3)]:
    pool=['une arrivée','une sortie','un départ','un achat','une consommation','un encouragement','une étude','une entrée']
    wr=[p for p in pool if p!=n][:3]
    wr=[p for p in pool if p!=n and p not in ('une étude',)][::2][:3]
    V(k,d,f"Quel est le nom qui correspond au verbe « {v} » ?",n,wr,f"{v} → {n}.")
k='study-expressions'
V(k,1,"Comment dit-on « to pass an exam » (to sit for it) ?","passer un examen",["réussir un examen à","échouer un examen de","suivre un examen"],"Passer un examen = to take an exam.")
V(k,2,"Quel verbe signifie « to fail » dans « Il ___ à l'examen » ?","échoue",["réussit","suit","passe"],"Échouer à un examen = to fail.")
V(k,2,"« Suivre des cours » signifie…","to attend classes",["to cancel classes","to teach classes","to avoid classes"],"Suivre des cours = to attend lessons.")
V(k,3,"Complétez : « Elle a ___ à son examen : elle a eu une bonne note. »","réussi",["échoué","suivi","oublié"],"Réussir à un examen = to pass successfully.")

# ---- Lesson 3
k='office-vocabulary'
V(k,1,"Quel objet sert à coller des papiers ?","la colle",["les ciseaux","l'agrafeuse","l'imprimante"],"La colle sert à coller.")
V(k,1,"Quel objet sert à couper du papier ?","les ciseaux",["la colle","le trombone","le ruban adhésif"],"Les ciseaux coupent.")
V(k,2,"Quel objet sert à agrafer des feuilles ?","l'agrafeuse",["l'imprimante","la chemise","le dossier"],"L'agrafeuse agrafe (stapler).")
V(k,2,"Que fait une imprimante ?","Elle imprime des documents.",["Elle coupe le papier.","Elle téléphone.","Elle range les dossiers."],"Une imprimante = printer.")
V(k,3,"Que peut-on mettre dans une chemise (au bureau) ?","des documents",["du thé","de la colle","des vêtements"],"Une chemise (de classement) protège les documents.")
k='job-search-vocabulary'
V(k,1,"Que veut dire « le chômage » ?","unemployment",["holiday","salary","interview"],"Être au chômage = to be unemployed.")
V(k,2,"Où trouve-t-on des offres de travail dans un journal ?","dans les annonces classées",["dans la météo","dans le sport","dans les bandes dessinées"],"Les annonces classées présentent des offres d'emploi.")
V(k,2,"Que veut dire CV ?","curriculum vitae",["carte de voyage","cours de vente","chambre vide"],"Le CV résume la formation et l'expérience.")
V(k,3,"Que signifie « l'intérim » ?","un travail temporaire",["une retraite","un cours du soir","un congé"],"Faire de l'intérim = faire un travail temporaire.")
V(k,3,"« pôle-emploi.fr » est un site pour…","chercher du travail",["acheter des livres","réserver un hôtel","apprendre le sport"],"Pôle emploi aide les chômeurs à trouver du travail.")
k='travail-expressions'
V(k,1,"Comment dit-on « to look for a job » ?","chercher du travail",["perdre le chômage","faire un faux travail","trouver du chômage"],"Chercher du travail.")
V(k,2,"« Être au chômage » signifie…","ne pas avoir de travail",["avoir deux emplois","partir en vacances","être médecin"],"Être au chômage = to be unemployed.")
V(k,2,"Complétez : « Il travaille à ___ partiel. » (part-time)","temps",["jour","mois","heure"],"Un travail à temps partiel.")
V(k,3,"Quelle phrase est correcte ?","Elle a trouvé du travail dans une banque.",["Elle a trouvé travail de la banque.","Elle est trouvé du travail à banque.","Elle a trouvée un travail banque."],"Trouver du travail dans + lieu.")

# ---- Lesson 4
k='library-facts'
C(k,2,"Pour avoir une carte de lecteur, un jeune doit en général donner…","une pièce d'identité et l'autorisation des parents",["un passeport étranger","une lettre de l'école seulement","un chèque de mille euros"],"La carte de lecteur demande une pièce d'identité et, pour un mineur, une autorisation des parents.")
V(k,1,"Que peut-on emprunter dans une médiathèque ?","des livres, des BD et des DVD",["des voitures","des vêtements","des repas"],"On emprunte livres, BD, CD/DVD, revues…")
V(k,2,"Que signifie « une carte de lecteur » ?","a library card",["a credit card","a bus pass","a birthday card"],"Une carte de lecteur = library membership card.")
V(k,3,"Quel justificatif de domicile peut-on donner à la bibliothèque ?","une quittance de loyer",["un billet de train","un ticket de cinéma","une carte postale"],"La quittance de loyer ou d'électricité prouve l'adresse.")
k='reading-genres-and-authors'
C(k,1,"Qui a écrit « Le Petit Prince » ?","Antoine de Saint-Exupéry",["Jules Verne","Charles Perrault","Mark Twain"],"Le Petit Prince est de Saint-Exupéry.")
C(k,2,"Qui a écrit « Le Tour du monde en quatre-vingts jours » ?","Jules Verne",["La Fontaine","Perrault","Saint-Exupéry"],"Jules Verne est l'auteur de ce roman d'aventures.")
C(k,2,"« Le Renard et les raisins » est une fable de…","La Fontaine",["Jules Verne","Mark Twain","Maurice Leblanc"],"La Fontaine a écrit beaucoup de fables.")
C(k,3,"Quel personnage de roman est un gentleman cambrioleur ?","Arsène Lupin",["Tom Sawyer","Le Petit Prince","Tintin"],"Arsène Lupin est le héros de Maurice Leblanc.")
C(k,3,"Qui a écrit « Cendrillon » et « Le Chat botté » ?","Charles Perrault",["La Fontaine","Jules Verne","R. K. Narayan"],"Perrault est l'auteur de contes classiques.")
k='newspaper-sections'
V(k,1,"Dans quelle rubrique trouve-t-on les résultats d'un match ?","les sports",["la météo","les petites annonces","la politique"],"Les résultats de match sont dans la rubrique sport.")
V(k,2,"Où trouve-t-on le temps qu'il fera demain ?","la météo",["l'économie","la culture","les faits divers"],"La météo annonce le temps.")
V(k,2,"« Les petites annonces » sont…","des messages pour acheter, vendre ou chercher du travail",["des lettres de lecteurs","des photos de vacances","des recettes de cuisine"],"Les petites annonces sont de courts messages.")
V(k,3,"Où lit-on les nouvelles du gouvernement ?","la politique",["la météo","les jeux","le sport"],"La rubrique politique parle du gouvernement.")

# ---- Lesson 5
k='media-vocabulary'
V(k,1,"Quels sont les trois grands médias de la leçon ?","la radio, la télévision et la presse écrite",["le théâtre, le cinéma et le cirque","le train, l'avion et le bateau","l'école, le bureau et la maison"],"Radio, télévision et presse écrite.")
V(k,2,"« Zapper » veut dire…","changer de chaîne avec la télécommande",["éteindre la radio","acheter un journal","écrire un article"],"Zapper = to channel-surf.")
V(k,2,"Un « feuilleton » est…","une série à suivre à la télé",["un journal du soir","un poste de radio","une publicité"],"Un feuilleton raconte une histoire en plusieurs épisodes.")
V(k,3,"Un journal « quotidien » paraît…","tous les jours",["une fois par semaine","une fois par mois","une fois par an"],"Quotidien = daily; hebdomadaire = weekly; mensuel = monthly.")
V(k,3,"Un magazine « mensuel » paraît…","une fois par mois",["tous les jours","chaque semaine","chaque heure"],"Mensuel = monthly.")
k='french-media-facts'
C(k,1,"Lequel est un journal français ?","Le Monde",["Canal+","Europe 1","ARTE"],"Le Monde est un quotidien; Canal+ et ARTE sont des chaînes de télévision, Europe 1 est une radio.")
C(k,2,"Quelle est une station de radio ?","Europe 1",["TF1","Le Figaro","L'Express"],"Europe 1 est une radio; TF1 est une chaîne; Le Figaro et L'Express sont des journaux.")
C(k,2,"Quelle est une chaîne de télévision ?","TF1",["RFI","Le Monde","France Musique"],"TF1 est une chaîne de télé; RFI et France Musique sont des radios.")
C(k,3,"Lequel est un journal et non une chaîne de télévision ?","Le Figaro",["France 2","Canal+","ARTE"],"Le Figaro est un quotidien.")
C(k,3,"Quelle chaîne de télévision est internationale et francophone ?","TV5",["Le Monde","RFI","L'Express"],"TV5 est une chaîne francophone.")

# ---- Lesson 6
k='hobbies-and-tastes'
V(k,1,"Quel est le passe-temps de quelqu'un qui plante des fleurs ?","le jardinage",["la natation","la lecture","la peinture"],"Le jardinage = gardening.")
V(k,2,"« Ça te dit de venir au cinéma ? » signifie…","Do you feel like coming to the cinema?",["Did you tell me about the cinema?","Say it to the cinema.","Where is the cinema?"],"« Ça te dit de… ? » propose une activité.")
C(k,2,"Quel est un héros de bande dessinée ?","Astérix",["Arsène Lupin","Le Petit Prince","Tom Sawyer"],"Astérix et Tintin sont des héros de BD.")
C(k,3,"Qui a écrit « Malgudi Days » ?","R. K. Narayan",["Jules Verne","La Fontaine","Perrault"],"R. K. Narayan est un auteur indien.")
V(k,2,"Quelle phrase exprime un goût positif ?","J'adore le jardinage.",["Je déteste le jardinage.","Je ne supporte pas le jardinage.","Le jardinage m'ennuie."],"J'adore = I love.")
k='museums-and-cinema'
C(k,1,"Quel musée de Paris possède une pyramide de verre ?","le Louvre",["le musée d'Orsay","la Sorbonne","le Panthéon"],"La pyramide du Louvre est de l'architecte I. M. Pei.")
C(k,2,"Quel musée présente surtout des peintres impressionnistes ?","le musée d'Orsay",["le Louvre","le Sénat","l'Élysée"],"Le musée d'Orsay montre Renoir, Van Gogh, etc.")
C(k,2,"Le Louvre est situé sur quelle rive de la Seine ?","la rive droite",["la rive gauche","une île","la rive nord de la Loire"],"Le Louvre est sur la rive droite de la Seine.")
C(k,3,"Avant d'être un musée, le Louvre était…","un château et un palais de rois",["une gare","une école","un marché"],"Le Louvre a été un château fort puis un palais royal.")
V(k,3,"« VO » dans « un film en VO » signifie…","version originale",["voix officielle","vitesse de ouverture","vente organisée"],"VO = version originale (langue d'origine du film).")
k='proverbs-and-expressions'
V(k,2,"Quel proverbe veut dire « Better late than never » ?","Mieux vaut tard que jamais.",["Petit à petit, l'oiseau fait son nid.","L'habit ne fait pas le moine.","Tout vient à point à qui sait attendre."],"Mieux vaut tard que jamais.")
V(k,3,"« L'habit ne fait pas le moine » veut dire…","On ne juge pas quelqu'un sur son apparence.",["Il faut s'habiller en noir.","Les moines aiment les vêtements.","Il faut changer d'habit souvent."],"Il ne faut pas juger sur l'apparence.")
V(k,3,"« Petit à petit, l'oiseau fait son nid » veut dire…","Avec de la patience, on arrive au but.",["Les oiseaux sont petits.","Il faut construire vite.","Le nid est toujours petit."],"Patience et travail régulier.")
V(k,2,"Complétez le proverbe : « Pierre qui roule n'amasse pas ___ . »","mousse",["herbe","eau","sable"],"Pierre qui roule n'amasse pas mousse.")

# ---- Lesson 7
k='healthy-lifestyle'
V(k,1,"Quelle habitude est bonne pour la santé ?","faire du jogging",["manger du fast-food tous les jours","dormir peu","ne pas boire d'eau"],"Le jogging est bon pour la santé.")
V(k,1,"Que faut-il boire pour être en bonne santé ?","de l'eau",["du soda","de la limonade sucrée","du café fort le soir"],"Il faut boire de l'eau.")
V(k,2,"Quel repas est le plus équilibré ?","une salade avec du poisson",["un burger avec des frites","un gâteau au chocolat","des bonbons"],"La salade et le poisson sont équilibrés.")
V(k,2,"Le yoga est…","un exercice du corps et de l'esprit",["un plat","un médicament","un sport d'équipe avec ballon"],"Le yoga est bon pour le corps et l'esprit.")
k='at-the-doctor'
V(k,1,"Où va-t-on quand on est malade ?","chez le médecin",["à la bibliothèque","au musée","au cinéma"],"On consulte un médecin.")
V(k,2,"Que donne le médecin pour acheter des médicaments ?","une ordonnance",["un CV","une quittance","une bourse"],"L'ordonnance se présente à la pharmacie.")
V(k,2,"Où achète-t-on les médicaments ?","à la pharmacie",["à la poste","à la mairie","à la gare"],"La pharmacie vend les médicaments.")
V(k,2,"Quel symptôme est une température élevée ?","la fièvre",["le rhume","le vertige","l'insomnie"],"La fièvre = fever.")
V(k,3,"Quel mal est un nez qui coule ?","un rhume",["une crise cardiaque","une fracture","une allergie au pollen"],"Un rhume = a cold.")
k='health-expressions-securite-sociale'
V(k,1,"Comment dit-on « I have a headache » ?","J'ai mal à la tête.",["Je suis mal à la tête.","J'ai mal de la tête.","Je mal à la tête."],"Avoir mal à la tête.")
V(k,2,"Complétez : « Il a mal ___ dents. »","aux",["au","à la","des"],"Avoir mal aux dents (à + les).")
V(k,2,"« La sécu » est le nom courant de…","la sécurité sociale",["la sécurité routière","la sécurité de l'école","la secrétaire"],"La sécu rembourse une partie des frais de santé.")
V(k,3,"« Passer une nuit blanche » signifie…","ne pas dormir de la nuit",["dormir dans un lit blanc","dormir tard","rêver en couleurs"],"Une nuit blanche = a sleepless night.")
V(k,3,"« L'insomnie » est…","la difficulté à dormir",["la fatigue après le sport","un médicament","une maladie de peau"],"Insomnie = difficulty sleeping.")

# ---- Lesson 8
k='environment-vocabulary'
V(k,1,"Comment dit-on « global warming » ?","le réchauffement de la terre",["le gaspillage de l'eau","la biodiversité","le robinet"],"Le réchauffement de la terre = global warming.")
V(k,2,"« Le gaspillage » signifie…","waste",["recycling","pollution only","energy"],"Gaspiller = to waste.")
V(k,2,"« La biodiversité » désigne…","la variété des êtres vivants",["la quantité d'eau","la hauteur des arbres","le prix de l'électricité"],"La biodiversité = variety of living things.")
V(k,3,"Un « gaz à effet de serre » contribue…","au réchauffement de la planète",["à nettoyer l'air","à refroidir les océans","à faire pousser les arbres"],"Les gaz à effet de serre réchauffent la planète.")
k='protecting-the-planet'
V(k,1,"Que faut-il faire du robinet quand on se brosse les dents ?","le fermer",["l'ouvrir plus fort","le casser","le laisser ouvert"],"Fermer le robinet économise l'eau.")
V(k,2,"Que faut-il faire quand on quitte une pièce ?","éteindre la lumière",["laisser la lumière","allumer la télévision","ouvrir toutes les fenêtres"],"Éteindre la lumière économise l'électricité.")
V(k,2,"Quelle phrase protège l'environnement ?","Je trie mes déchets.",["Je jette tout par terre.","Je laisse couler l'eau.","Je brûle le plastique."],"Trier les déchets aide le recyclage.")
G(k,3,"Complétez : « Il faut que nous ___ moins d'eau. » (utiliser)","utilisions",["utilisons","utiliserons","utilisions-nous"],"Il faut que + subjonctif : que nous utilisions.")
G(k,3,"Complétez : « Je souhaite qu'on ___ la planète. » (protéger)","protège",["protège-t-on","protégera","protégeait"],"Souhaiter que + subjonctif : qu'on protège.")

# ---- Lesson 10
k='french-political-system'
C(k,1,"Où travaille l'Assemblée nationale ?","au Palais Bourbon",["au Palais de l'Élysée","au Palais du Luxembourg","au Louvre"],"L'Assemblée nationale siège au Palais Bourbon.")
C(k,1,"Où habite le Président de la République française ?","au Palais de l'Élysée",["au Palais Bourbon","au Louvre","à l'Opéra"],"Le Président travaille à l'Élysée.")
C(k,2,"Qui élit les députés ?","les citoyens",["le Sénat","le Président seul","les ambassadeurs"],"Les députés sont élus par le peuple.")
C(k,2,"Combien de temps dure le mandat du Président de la République ?","cinq ans",["deux ans","dix ans","sept mois"],"Le mandat présidentiel dure cinq ans.")
C(k,3,"Qui nomme le Premier ministre en France ?","le Président",["l'Assemblée nationale","les sénateurs","le peuple"],"Le Président nomme le Premier ministre.")
C(k,3,"Le Sénat siège…","au Palais du Luxembourg",["à l'Élysée","au Louvre","à Orsay"],"Le Sénat se réunit au Palais du Luxembourg; ses membres sont les sénateurs.")
k='indian-political-system-in-french'
C(k,2,"Dans quel bâtiment habite le Président de l'Inde ?","Rashtrapati Bhavan",["le Palais de l'Élysée","le Palais du Luxembourg","le Palais Bourbon"],"Rashtrapati Bhavan est la résidence du Président de l'Inde, à New Delhi.")
C(k,2,"Quelle assemblée est l'équivalent de la Chambre basse en Inde ?","Lok Sabha",["Rajya Sabha","le Sénat français","le Conseil d'État"],"Lok Sabha = Chambre du peuple.")
C(k,3,"Qui dirige généralement le parti majoritaire et le gouvernement en Inde ?","le Premier ministre",["le Président","le juge en chef","le ministre en chef de l'État"],"Le Premier ministre dirige le gouvernement.")
C(k,3,"Comment appelle-t-on le chef du gouvernement d'un État indien ?","le Chief Minister",["le Président","le sénateur","le député"],"Chief Minister = ministre en chef d'un État.")
k='telephone-expressions'
V(k,1,"Comment dit-on « to phone someone » ?","téléphoner à quelqu'un",["téléphoner quelqu'un","téléphoner de quelqu'un","téléphoner pour quelqu'un à"],"Téléphoner à quelqu'un.")
V(k,2,"« Donner un coup de fil » signifie…","passer un appel téléphonique",["frapper à la porte","couper un fil","écrire une lettre"],"Un coup de fil = a phone call.")
V(k,2,"« Faire un faux numéro » signifie…","composer un mauvais numéro",["appeler la police","répondre en retard","laisser un message"],"Faux numéro = wrong number.")
V(k,3,"« Tomber sur un répondeur » signifie…","joindre un répondeur au lieu de la personne",["perdre son téléphone","casser le téléphone","répondre en français"],"Un répondeur enregistre les messages.")
V(k,3,"Que fait-on après « Je tombe sur un répondeur » ?","On laisse un message.",["On ferme la porte.","On ouvre un compte.","On achète un téléphone."],"Laisser un message sur le répondeur.")

# ---- Reading comprehension: original passages
k='passage-true-false'
T1="Lecture : « Léa habite à Lyon avec ses parents et son petit frère. Tous les samedis, elle va à la bibliothèque et emprunte deux livres. Le dimanche, elle fait du jogging avec son père. »"
C(k,1,T1+" Quelle affirmation est vraie ?","Léa va à la bibliothèque le samedi.",["Léa habite à Paris.","Léa a une sœur.","Léa fait du jogging le lundi."],"Le texte dit : tous les samedis, elle va à la bibliothèque.")
C(k,2,T1+" Quelle affirmation est fausse ?","Léa fait du jogging avec sa mère.",["Léa emprunte des livres.","Léa a un petit frère.","Léa habite à Lyon."],"Elle fait du jogging avec son père, pas avec sa mère.")
T2="Lecture : « Nous sommes allés au musée d'Orsay dimanche dernier. Il y avait beaucoup de visiteurs, mais nous avons vu les tableaux de Van Gogh. Mon frère a acheté une carte postale. »"
C(k,2,T2+" Quelle affirmation est vraie ?","Ils ont vu des tableaux de Van Gogh.",["Le musée était vide.","Ils sont allés au Louvre.","Le frère a acheté un livre."],"Le texte dit qu'ils ont vu les tableaux de Van Gogh.")
C(k,3,T2+" Quelle affirmation est fausse ?","Ils sont allés au musée lundi.",["Il y avait beaucoup de visiteurs.","Le frère a acheté une carte postale.","Ils ont visité un musée à Paris."],"La visite était dimanche dernier, pas lundi.")
k='passage-short-answer'
T3="Lecture : « Karim cherche du travail. Il a envoyé son CV à trois entreprises. Mardi, une entreprise l'a appelé pour un entretien. Karim était nerveux, mais l'entretien s'est bien passé. »"
C(k,1,T3+" Qu'est-ce que Karim cherche ?","du travail",["un appartement","une voiture","un médecin"],"La première phrase le dit.")
C(k,2,T3+" Combien d'entreprises ont reçu son CV ?","trois",["deux","cinq","une"],"Il a envoyé son CV à trois entreprises.")
C(k,2,T3+" Quand l'entreprise l'a-t-elle appelé ?","mardi",["lundi","dimanche","jeudi"],"Mardi, une entreprise l'a appelé.")
C(k,3,T3+" Comment Karim se sentait-il avant l'entretien ?","nerveux",["content","fatigué","triste"],"Le texte dit qu'il était nerveux.")
k='vocabulary-search'
T4="Lecture : « Hier, mon père a pris l'ordonnance du médecin et il est allé à la pharmacie. Il avait de la fièvre et un gros rhume. Il se repose maintenant à la maison. »"
V(k,2,T4+" Quel mot signifie « fever » ?","fièvre",["rhume","ordonnance","pharmacie"],"Fièvre = fever.")
V(k,2,T4+" Quel mot désigne le papier du médecin ?","ordonnance",["fièvre","maison","rhume"],"L'ordonnance est le papier du médecin.")
V(k,3,T4+" Quel verbe veut dire « to rest » ?","se reposer",["prendre","aller","avoir"],"Il se repose = he is resting.")
V(k,3,T4+" Le mot « rhume » désigne…","a cold",["a fever","a pharmacy","a prescription"],"Un rhume = a cold.")
k='data-and-picture-reading'
T5="Horaires de la médiathèque : lundi fermé; mardi à vendredi 10 h–18 h; samedi 10 h–17 h; dimanche fermé."
C(k,1,T5+" Quel jour la médiathèque est-elle ouverte jusqu'à 17 h ?","samedi",["mardi","vendredi","dimanche"],"Le samedi, elle ferme à 17 h.")
C(k,1,T5+" Quels jours est-elle fermée ?","lundi et dimanche",["samedi et dimanche","lundi et mardi","vendredi et samedi"],"Fermé le lundi et le dimanche.")
T6="Affiche : « Fête de l'école — samedi 14 décembre, de 14 h à 18 h — entrée gratuite pour les enfants, 3 euros pour les adultes. »"
C(k,2,T6+" Combien paie un adulte ?","3 euros",["gratuit","14 euros","18 euros"],"3 euros pour les adultes.")
C(k,2,T6+" À quelle heure la fête commence-t-elle ?","à 14 h",["à 18 h","à 3 h","à 10 h"],"De 14 h à 18 h.")

# ---- Writing tasks (objective)
k='informal-letter'
S(k,1,"Quelle formule convient pour commencer une lettre à un ami ?","Cher Paul,",["Monsieur le Directeur,","Veuillez agréer,","Cordialement vôtre,"],"On écrit « Cher/Chère + prénom » à un ami.")
S(k,2,"Quelle formule convient pour terminer une lettre à un ami ?","Amitiés,",["Veuillez agréer mes salutations distinguées,","Monsieur,","Objet :"],"Amitiés, Bises ou À bientôt, pour un ami.")
S(k,2,"Comment écrit-on la date en haut d'une lettre ?","Delhi, le 12 mars 2027",["12 mars Delhi 2027 le","Le Delhi 12, mars","2027 mars 12 Delhi"],"Lieu, le jour mois année.")
S(k,3,"Quelle phrase commence bien une lettre de remerciements ?","Merci beaucoup de ta lettre.",["Je suis monsieur.","Veuillez trouver ci-joint.","Salutations distinguées."],"Merci de ta lettre = Thanks for your letter.")
S(k,3,"Quelle phrase est une bonne fin de lettre ?","J'attends ta réponse avec impatience.",["Je ne réponds pas.","Voici le CV.","Pas de nouvelles."],"On termine souvent en demandant des nouvelles.")
k='message-writing'
S(k,1,"Un message court contient généralement…","le destinataire, le message et la signature",["seulement la date","seulement le titre","un dessin"],"Un message : à qui, quoi, de la part de qui.")
S(k,2,"Quelle formule invite un ami ?","Viens à ma fête samedi !",["Veuillez agréer mes salutations.","Voir pièce jointe.","Tu es invité de rien."],"Une invitation amicale à l'impératif.")
S(k,2,"Quelle formule remercie un ami ?","Merci pour le cadeau, c'est très gentil !",["Je n'ai pas de cadeau.","Donne-moi le cadeau.","Il n'y a pas de cadeau."],"Merci pour + nom.")
S(k,3,"Quel message annonce un retard ?","Je serai en retard, j'arrive à 18 h.",["Je suis mort de rire.","Je ne viens jamais.","Je mange un gâteau."],"On donne l'heure d'arrivée.")
k='dialogue-rearranging'
S(k,2,"Remettez le dialogue dans l'ordre (réponse sous la forme « 2 puis 1 … ») : (1) Oui, avec plaisir ! (2) Salut ! Tu viens au cinéma ce soir ? (3) À quelle heure ? (4) À huit heures.","2 puis 1 puis 3 puis 4",["1 puis 2 puis 3 puis 4","2 puis 3 puis 1 puis 4","4 puis 3 puis 2 puis 1"],"Question, réponse, question, réponse.")
S(k,2,"Remettez dans l'ordre (réponse sous la forme « 2 puis 1 … ») : (1) Bonjour madame. (2) Bonjour. Vous désirez ? (3) Je voudrais un kilo de pommes.","2 puis 1 puis 3",["3 puis 2 puis 1","1 puis 3 puis 2","2 puis 3 puis 1"],"On commence par saluer, puis on demande.")
S(k,3,"Quel est le bon début d'un appel téléphonique ?","Allô ? Bonjour, c'est Paul.",["Au revoir, Paul.","Merci beaucoup, adieu.","Je raccroche."],"On commence par Allô et on se présente.")
S(k,3,"Remettez dans l'ordre (réponse sous la forme « 2 puis 1 … ») : (1) Merci, au revoir ! (2) Voilà, ça fait six euros. (3) Je voudrais deux croissants.","3 puis 2 puis 1",["1 puis 2 puis 3","2 puis 3 puis 1","3 puis 1 puis 2"],"Demande, prix, remerciement.")
k='story-completion'
G(k,2,"Complétez l'histoire : « Il pleuvait, alors je ___ mon parapluie. »","j'ai pris",["je prendrai","je prenais","je prends"],"Une action ponctuelle dans le passé → passé composé.")
G(k,3,"Complétez : « Quand je suis arrivé, le film ___ déjà commencé. »","avait",["a","aura","avait eu"],"Une action déjà passée → plus-que-parfait : avait commencé.")
G(k,3,"Complétez : « Autrefois, nous ___ chez mes grands-parents tous les étés. »","allions",["sommes allés","irons","allons"],"Habitude dans le passé → imparfait.")
G(k,3,"Complétez : « Demain, s'il fait beau, nous ___ au parc. »","irons",["irions","sommes allés","allons allé"],"Si + présent → futur.")

if __name__ == '__main__':
    import sys; L.write(sys.argv[1], 'french', Q)
