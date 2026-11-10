# v123: French grammar-skill questions other than verb tenses (original, written for Sahayak).
import fr_lib as L
from fr_lib import mcq, fill
Q = []
def M(skill, d, prompt, ok, wr, ex, tag='GRAMMAR_RULE'): Q.append(mcq(skill, d, prompt, ok, wr, ex, tag))

# cod-pronouns
M('cod-pronouns',1,"Remplacez le mot souligné : « Je vois Paul. » → « Je ___ vois. »","le",["lui","la","les"],"Paul est un COD masculin singulier → le.")
M('cod-pronouns',1,"Remplacez : « Elle écoute la radio. » → « Elle ___ écoute. »","la",["le","lui","l'"],"La radio est un COD féminin singulier → la.")
M('cod-pronouns',2,"Remplacez : « Nous achetons les billets. » → « Nous ___ achetons. »","les",["leur","lui","le"],"Les billets : COD pluriel → les.")
M('cod-pronouns',2,"Remplacez : « Tu aimes cette chanson ? » → « Tu ___ aimes ? »","l'",["lui","les","y"],"Devant un verbe qui commence par une voyelle, le/la devient l'.")
M('cod-pronouns',3,"Quelle phrase est correcte ?","Je les ai vus hier.",["Je ai les vus hier.","Je leur ai vus hier.","Je les ai vu hier."],"Au passé composé, le pronom COD se place devant l'auxiliaire; le participe s'accorde avec « les » : vus.")

# coi-pronouns
M('coi-pronouns',1,"Remplacez : « Je parle à Marie. » → « Je ___ parle. »","lui",["la","le","leur"],"Parler à quelqu'un : COI singulier → lui.")
M('coi-pronouns',2,"Remplacez : « Il téléphone à ses amis. » → « Il ___ téléphone. »","leur",["lui","les","eux"],"À + personnes (pluriel) → leur.")
M('coi-pronouns',2,"Complétez : « Elle ___ donne un livre. » (à moi)","me",["lui","leur","y"],"À moi → me (m' devant voyelle).")
M('coi-pronouns',3,"Quelle phrase est correcte ?","Je leur ai écrit une lettre.",["Je les ai écrit une lettre.","Je ai leur écrit une lettre.","Je lui ai écrits une lettre."],"Écrire à quelqu'un : COI pluriel → leur, placé devant l'auxiliaire.")
M('coi-pronouns',3,"Quel verbe se construit avec « à » + personne ?","téléphoner",["regarder","écouter","attendre"],"On téléphone à quelqu'un; on regarde, écoute, attend quelqu'un (COD).")

# tonic-pronouns
M('tonic-pronouns',1,"Complétez : « C'est ___ qui ai gagné. » (je)","moi",["je","me","mon"],"Le pronom tonique de « je » est moi.")
M('tonic-pronouns',2,"Complétez : « Tu viens avec ___ ? » (nous)","nous",["on","nos","leur"],"Après une préposition, on emploie le pronom tonique : avec nous.")
M('tonic-pronouns',2,"Complétez : « Ce livre est à ___ . » (elle)","elle",["lui","leur","la"],"À + pronom tonique : à elle.")
M('tonic-pronouns',3,"Complétez : « Eux, ils partent; ___ , elles restent. »","elles",["eux","les","leur"],"Le pronom tonique féminin pluriel est elles.")
M('tonic-pronouns',3,"Complétez : « Pierre ? Je pense souvent à ___ . »","lui",["le","il","son"],"Penser à + personne → à lui.")

# pronoun-y
M('pronoun-y',1,"Remplacez : « Je vais à Paris. » → « J'___ vais. »","y",["en","lui","le"],"Y remplace un lieu introduit par à, chez, dans.")
M('pronoun-y',2,"Remplacez : « Il pense à son examen. » → « Il ___ pense. »","y",["en","lui","le"],"Penser à + chose → y.")
M('pronoun-y',2,"Que remplace « y » dans « Nous y allons demain » ?","un lieu",["une personne","une quantité","un adjectif"],"Y remplace un lieu (à la bibliothèque, chez le médecin…).")
M('pronoun-y',3,"Répondez : « Tu vas à la poste ? » (non)","Non, je n'y vais pas.",["Non, je n'en vais pas.","Non, je ne lui vais pas.","Non, je n'y pas vais."],"Négation autour du pronom et du verbe : je n'y vais pas.")
M('pronoun-y',3,"Quelle phrase est correcte ?","Allons-y !",["Allons-en !","Allons-lui !","Y allons !"],"À l'impératif, y se place après le verbe avec un trait d'union.")

# pronoun-en
M('pronoun-en',1,"Remplacez : « Je mange du pain. » → « J'___ mange. »","en",["y","le","lui"],"En remplace du/de la/des + nom.")
M('pronoun-en',2,"Remplacez : « Il a deux frères. » → « Il ___ a deux. »","en",["y","les","leur"],"En remplace « frères » avec un nombre.")
M('pronoun-en',2,"Remplacez : « Elle parle de son voyage. » → « Elle ___ parle. »","en",["y","lui","le"],"Parler de + chose → en.")
M('pronoun-en',3,"Répondez : « Tu as des timbres ? » (oui)","Oui, j'en ai.",["Oui, j'y ai.","Oui, je les ai des.","Oui, j'ai en."],"En se place devant le verbe : j'en ai.")
M('pronoun-en',3,"Quelle phrase est correcte ?","Il en reste trois.",["Il y reste trois.","Il reste en trois.","Il en trois reste."],"Quantité exprimée → en + verbe + nombre.")

# pronoun-placement
M('pronoun-placement',2,"Dans quel ordre sont les pronoms ? « Il me donne le livre. » → « Il ___ donne. »","me le",["le me","lui le","me lui"],"Ordre : me/te/nous/vous avant le/la/les.")
M('pronoun-placement',3,"Remplacez les deux compléments : « Je donne la clé à Paul. »","Je la lui donne.",["Je lui la donne.","Je la donne lui.","Je le lui donne."],"le/la/les avant lui/leur : je la lui donne.")
M('pronoun-placement',3,"Quelle phrase est correcte (impératif affirmatif) ?","Donne-le-moi !",["Moi-le donne !","Le me donne !","Donne-moi-le !"],"À l'impératif affirmatif : verbe-COD-moi.")
M('pronoun-placement',4,"Où place-t-on le pronom dans « Je veux (le voir / voir le) » ?","Je veux le voir.",["Je le veux voir.","Je veux voir le.","Je veux le voir lui."],"Avec un infinitif, le pronom se place devant l'infinitif.")
M('pronoun-placement',4,"Mettez en ordre : « Elle ___ ___ envoie. » (leur, les)","les leur",["leur les","les y","en leur"],"les avant leur : elle les leur envoie.")

# negation-forms
M('negation-forms',1,"Mettez à la forme négative : « Je mange. »","Je ne mange pas.",["Je ne pas mange.","Je mange ne pas.","Je pas mange."],"Ne se place avant le verbe, pas après.")
M('negation-forms',2,"Quelle négation signifie « never » ?","ne … jamais",["ne … plus","ne … rien","ne … personne"],"jamais = never.")
M('negation-forms',2,"Quelle négation signifie « nothing » ?","ne … rien",["ne … jamais","ne … plus","ne … que"],"rien = nothing.")
M('negation-forms',3,"Complétez : « Il n'y a ___ dans la boîte. » (nothing)","rien",["jamais","plus","personne"],"Rien = nothing.")
M('negation-forms',3,"Quelle phrase est correcte ?","Je ne connais personne ici.",["Je connais ne personne ici.","Je ne personne connais ici.","Je ne connais ici personne pas."],"Ne + verbe + personne.")

# negation-tenses
M('negation-tenses',2,"Mettez au passé composé négatif : « J'ai mangé. »","Je n'ai pas mangé.",["Je n'ai mangé pas.","Je ne pas ai mangé.","Je ai pas mangé."],"Ne … pas entourent l'auxiliaire.")
M('negation-tenses',3,"Mettez à la forme négative : « Il va partir. » (futur proche)","Il ne va pas partir.",["Il va ne pas partir.","Il ne va partir pas.","Il va partir pas."],"Ne … pas entourent le verbe conjugué.")
M('negation-tenses',3,"Négation de l'infinitif : « Je décide de ___ venir. »","ne pas",["pas ne","non","ne"],"À l'infinitif : ne pas + infinitif.")
M('negation-tenses',3,"Mettez à la forme négative : « Nous sommes sortis. »","Nous ne sommes pas sortis.",["Nous ne sommes sortis pas.","Nous sommes ne pas sortis.","Nous ne pas sommes sortis."],"Ne … pas entourent l'auxiliaire être.")
M('negation-tenses',4,"Quelle phrase est correcte ?","Il n'a vu personne.",["Il n'a personne vu.","Il n'a vu pas personne.","Il ne a vu personne."],"Au passé composé, personne se place après le participe passé.")

# negation-replies
M('negation-replies',1,"Répondez : « Tu as faim ? » (non)","Non, je n'ai pas faim.",["Non, je ai pas faim.","Non, j'ai ne pas faim.","Non, je pas ai faim."],"Négation : ne … pas autour du verbe avoir.")
M('negation-replies',2,"Répondez : « Tu vois quelqu'un ? » (non)","Non, je ne vois personne.",["Non, je ne vois rien.","Non, je vois personne ne.","Non, je ne vois jamais."],"quelqu'un → personne.")
M('negation-replies',2,"Répondez : « Tu veux quelque chose ? » (non)","Non, je ne veux rien.",["Non, je ne veux personne.","Non, je veux ne rien.","Non, je ne veux jamais."],"quelque chose → rien.")
M('negation-replies',3,"Répondez : « Il fume encore ? » (non)","Non, il ne fume plus.",["Non, il ne fume jamais.","Non, il fume ne plus.","Non, il ne fume pas plus."],"encore → ne … plus.")
M('negation-replies',3,"Répondez : « Tu as déjà visité Paris ? » (non)","Non, je n'ai jamais visité Paris.",["Non, je n'ai pas jamais visité Paris.","Non, je n'ai plus visité Paris.","Non, je ne jamais ai visité Paris."],"déjà → ne … jamais.")

# question-forms
M('question-forms',1,"Quelle phrase pose une question avec « est-ce que » ?","Est-ce que tu viens ?",["Tu viens.","Viens tu ne ?","Que tu viens ?"],"Est-ce que + phrase affirmative.")
M('question-forms',2,"Transformez en question avec inversion : « Vous parlez français. »","Parlez-vous français ?",["Vous parlez-vous français ?","Parlez vous français ?","Français parlez-vous ?"],"Inversion : verbe-sujet avec un trait d'union.")
M('question-forms',2,"Quelle phrase est une question par l'intonation ?","Tu aimes le cinéma ?",["Aimes-tu le cinéma.","Est-ce tu aimes le cinéma.","Le cinéma tu aimes pas."],"On garde l'ordre normal et on monte la voix.")
M('question-forms',3,"Inversion avec « il/elle » : « Elle habite à Lyon. » → ___ à Lyon ?","Habite-t-elle",["Habite-elle","Elle habite-t-elle","Habite elle-t"],"On ajoute -t- entre deux voyelles : habite-t-elle.")
M('question-forms',3,"Quelle phrase est correcte ?","Est-ce que vous avez des frères ?",["Est-ce que vous avez-vous des frères ?","Avez est-ce que vous des frères ?","Est-ce vous avez des frères que ?"],"Est-ce que + sujet + verbe.")

# question-words
M('question-words',1,"« ___ habites-tu ? » — « À Delhi. »","Où",["Quand","Comment","Pourquoi"],"Où = where : il demande le lieu.")
M('question-words',1,"« ___ vas-tu partir ? » — « Demain. »","Quand",["Où","Combien","Qui"],"Quand = when : il demande le moment.")
M('question-words',2,"« ___ coûte ce livre ? » — « Dix euros. »","Combien",["Comment","Pourquoi","Quel"],"Combien (de) = how much.")
M('question-words',2,"« ___ est ce monsieur ? » — « C'est mon professeur de français. »","Qui",["Quand","Où","Combien"],"Qui = who : on demande l'identité d'une personne.")
M('question-words',3,"« ___ ne viens-tu pas ? » — « Parce que je suis malade. »","Pourquoi",["Comment","Quand","Où"],"Pourquoi → parce que.")

# find-the-question
M('find-the-question',2,"Trouvez la question : « J'habite à Mumbai. »","Où habites-tu ?",["Quand habites-tu ?","Qui habite à Mumbai ?","Comment habites-tu ?"],"La réponse donne un lieu → où.")
M('find-the-question',2,"Trouvez la question : « Ça coûte cinq euros. »","Combien ça coûte ?",["Quand ça coûte ?","Qui ça coûte ?","Où ça coûte ?"],"La réponse donne un prix → combien.")
M('find-the-question',3,"Trouvez la question : « Elle s'appelle Nargis. »","Comment elle s'appelle ?",["Où elle s'appelle ?","Quand elle s'appelle ?","Combien elle s'appelle ?"],"On demande le nom avec comment.")
M('find-the-question',3,"Trouvez la question : « Nous partons à huit heures. »","À quelle heure partez-vous ?",["Où partez-vous ?","Pourquoi partez-vous ?","Qui part à huit heures ?"],"Une heure → à quelle heure.")
M('find-the-question',3,"Trouvez la question : « Parce que j'ai un examen. »","Pourquoi es-tu fatigué ?",["Quand es-tu fatigué ?","Qui est fatigué ?","Où es-tu fatigué ?"],"« Parce que » répond à pourquoi.")

# indirect-statements
M('indirect-statements',2,"Mettez au discours indirect : Il dit : « Je suis fatigué. »","Il dit qu'il est fatigué.",["Il dit que je suis fatigué.","Il dit qu'il suis fatigué.","Il dit : qu'il est fatigué."],"Après dire que, la personne change : je → il.")
M('indirect-statements',2,"Mettez au discours indirect : Elle dit : « Nous partons. »","Elle dit qu'elles partent.",["Elle dit que nous partons.","Elle dit qu'elle partons.","Elle dit que elles partent."],"Nous → elles (ou ils) selon le contexte; verbe à la 3e personne.")
M('indirect-statements',3,"Mettez au discours indirect : Marc dit : « Demain, je viendrai. »","Marc dit que le lendemain il viendrait.",["Marc dit que demain je viendrai.","Marc dit que demain il viendra.","Marc dit que lendemain il viendrait."],"Après un verbe introducteur au passé, demain → le lendemain.")
M('indirect-statements',3,"Quel mot introduit le discours indirect d'une affirmation ?","que",["qui","dont","où"],"Dire que + proposition.")
M('indirect-statements',4,"Mettez au discours indirect : Pierre a dit : « J'ai faim. »","Pierre a dit qu'il avait faim.",["Pierre a dit qu'il a faim.","Pierre a dit que j'avais faim.","Pierre a dit qu'il aura faim."],"Après un verbe au passé composé, le présent devient imparfait.")

# indirect-commands
M('indirect-commands',2,"Mettez au discours indirect : Elle dit à Paul : « Viens ! »","Elle dit à Paul de venir.",["Elle dit à Paul qu'il vient.","Elle dit à Paul venir.","Elle dit à Paul que de venir."],"Ordre → dire à quelqu'un de + infinitif.")
M('indirect-commands',3,"Mettez au discours indirect : Le professeur dit : « Ouvrez vos livres ! »","Le professeur dit d'ouvrir les livres.",["Le professeur dit que ouvrez les livres.","Le professeur dit ouvrir les livres.","Le professeur dit qu'ouvrir les livres."],"L'impératif devient de + infinitif.")
M('indirect-commands',3,"Mettez au discours indirect négatif : « Ne parle pas ! » dit-elle à Marc.","Elle dit à Marc de ne pas parler.",["Elle dit à Marc ne pas de parler.","Elle dit à Marc qu'il ne parle pas de.","Elle dit à Marc pas parler."],"Ordre négatif → de ne pas + infinitif.")
M('indirect-commands',3,"Quelle préposition introduit un ordre au discours indirect ?","de",["que","si","à"],"dire/demander à quelqu'un de + infinitif.")
M('indirect-commands',4,"Mettez au discours indirect : Il lui demande : « Aide-moi. »","Il lui demande de l'aider.",["Il lui demande de aider moi.","Il lui demande qu'il aide.","Il lui demande l'aider."],"Aide-moi → de l'aider (moi → l' / me selon le sens).")

# indirect-questions
M('indirect-questions',2,"Mettez au discours indirect : Elle demande : « Tu viens ? »","Elle demande si je viens.",["Elle demande que je viens.","Elle demande est-ce que je viens.","Elle demande qui je viens."],"Question oui/non → si.")
M('indirect-questions',3,"Mettez au discours indirect : Il demande : « Où habites-tu ? »","Il demande où j'habite.",["Il demande où habites-tu.","Il demande que où j'habite.","Il demande si où j'habite."],"On garde le mot interrogatif; pas d'inversion.")
M('indirect-questions',3,"Mettez au discours indirect : Elle demande : « Qu'est-ce que tu fais ? »","Elle demande ce que je fais.",["Elle demande qu'est-ce que je fais.","Elle demande que je fais.","Elle demande si je fais."],"Qu'est-ce que → ce que.")
M('indirect-questions',4,"Mettez au discours indirect : Il a demandé : « Tu as fini ? »","Il a demandé si j'avais fini.",["Il a demandé que j'avais fini.","Il a demandé si tu as fini.","Il a demandé si j'ai fini."],"Après un verbe au passé, passé composé → plus-que-parfait; tu → je.")
M('indirect-questions',3,"Quelle phrase est correcte ?","Je me demande pourquoi elle pleure.",["Je me demande pourquoi pleure-t-elle.","Je me demande pourquoi est-ce qu'elle pleure.","Je demande-me pourquoi elle pleure."],"Dans la question indirecte, l'ordre est normal : sujet + verbe.")

# relative-qui-que-ou
M('relative-qui-que-ou',1,"Complétez : « La fille ___ chante est ma sœur. »","qui",["que","où","dont"],"Qui remplace le sujet.")
M('relative-qui-que-ou',2,"Complétez : « Le livre ___ je lis est passionnant. »","que",["qui","où","dont"],"Que remplace le COD (je lis le livre).")
M('relative-qui-que-ou',2,"Complétez : « La ville ___ j'habite est grande. »","où",["que","qui","dont"],"Où remplace un lieu.")
M('relative-qui-que-ou',3,"Complétez : « Le jour ___ nous sommes arrivés, il pleuvait. »","où",["que","qui","dont"],"Où peut aussi remplacer un moment.")
M('relative-qui-que-ou',3,"Complétez : « Les amis ___ je vois sont gentils. »","que",["qui","où","dont"],"COD → que (qu' devant voyelle).")

# relative-dont
M('relative-dont',2,"Complétez : « Voilà le livre ___ je parle. »","dont",["que","qui","où"],"Parler de → dont.")
M('relative-dont',3,"Complétez : « La femme ___ le fils est médecin habite ici. »","dont",["que","dont le","de qui"],"Dont exprime la possession (de qui/de laquelle).")
M('relative-dont',3,"Complétez : « C'est un film ___ j'ai besoin pour mon cours. »","dont",["que","qui","où"],"Avoir besoin de → dont.")
M('relative-dont',3,"Complétez : « L'acteur ___ tu parles est célèbre. »","dont",["qui","que","où"],"Parler de quelqu'un → dont.")
M('relative-dont',4,"Quelle phrase est correcte ?","Le stylo dont j'ai besoin est ici.",["Le stylo que j'ai besoin est ici.","Le stylo dont je ai besoin est ici.","Le stylo qui j'ai besoin est ici."],"Avoir besoin de → dont.")

# relative-compose
M('relative-compose',3,"Complétez : « Le stylo avec ___ j'écris est neuf. »","lequel",["que","dont","où"],"Après une préposition + chose masculine : lequel.")
M('relative-compose',3,"Complétez : « La table sur ___ je pose mon sac est grande. »","laquelle",["lequel","lesquels","dont"],"Table (féminin singulier) → laquelle.")
M('relative-compose',4,"Complétez : « Les amis auxquels je téléphone habitent loin. » : à + lesquels = ___","auxquels",["desquels","lesquels","duquel"],"à + lesquels = auxquels.")
M('relative-compose',4,"Complétez : « La rue au bout ___ il y a une école est courte. »","de laquelle",["de lequel","de quelle","lesquelles"],"Préposition longue de + laquelle (la rue → féminin).")
M('relative-compose',4,"Complétez : « Les raisons pour ___ il part sont claires. »","lesquelles",["lesquels","laquelle","dont"],"Raisons (féminin pluriel) → lesquelles.")

# demonstrative-adjectives
M('demonstrative-adjectives',1,"Complétez : « ___ livre est intéressant. » (masculin)","Ce",["Cet","Cette","Ces"],"Ce devant un nom masculin commençant par une consonne.")
M('demonstrative-adjectives',1,"Complétez : « ___ fille est ma cousine. »","Cette",["Ce","Cet","Ces"],"Féminin singulier → cette.")
M('demonstrative-adjectives',2,"Complétez : « ___ élève est très sérieux. »","Cet",["Ce","Cette","Ces"],"Masculin devant voyelle → cet.")
M('demonstrative-adjectives',2,"Complétez : « ___ enfants jouent dehors. »","Ces",["Ce","Cet","Cette"],"Devant un nom pluriel, on emploie ces.")
M('demonstrative-adjectives',3,"Complétez : « Je préfère ___ film-là. »","ce",["cet","cette","ces"],"Pour distinguer, on ajoute -ci / -là au nom.")

# demonstrative-pronouns-simple
M('demonstrative-pronouns-simple',3,"Complétez : « Ma maison et ___ de mon voisin sont proches. »","celle",["celui","ceux","celles"],"Maison est féminin singulier → celle.")
M('demonstrative-pronouns-simple',3,"Complétez : « Mon stylo et ___ de Paul sont noirs. »","celui",["celle","ceux","ce"],"Stylo est masculin singulier → celui.")
M('demonstrative-pronouns-simple',3,"Complétez : « Les livres de Marie et ___ de Paul sont neufs. »","ceux",["celles","celui","ce"],"Livres : masculin pluriel → ceux.")
M('demonstrative-pronouns-simple',4,"Complétez : « Mes robes et ___ de ma sœur sont rouges. »","celles",["ceux","celle","celui"],"Robes : féminin pluriel → celles.")
M('demonstrative-pronouns-simple',4,"Complétez : « ___ qui travaillent réussissent. » (les gens, masculin pluriel)","Ceux",["Celui","Celles","Ce"],"Ceux qui = those who.")

# demonstrative-pronouns-compound
M('demonstrative-pronouns-compound',3,"Complétez : « Tu préfères ce livre-ci ou ___-là ? »","celui",["celle","ceux","ce"],"Livre → celui-là.")
M('demonstrative-pronouns-compound',3,"Complétez : « Cette robe est jolie, mais ___-ci est plus chère. »","celle",["celui","ceux","cela"],"Robe → celle-ci.")
M('demonstrative-pronouns-compound',4,"Quelle forme signifie « those (m.) over there » ?","ceux-là",["celui-ci","celles-ci","celle-là"],"ceux-là = masculin pluriel, plus éloigné.")
M('demonstrative-pronouns-compound',4,"Complétez : « Ces fleurs sont belles; ___-ci sont rouges. »","celles",["ceux","celle","celui"],"Fleurs : féminin pluriel → celles-ci.")
M('demonstrative-pronouns-compound',4,"« Celui-ci » désigne …","un objet proche",["un objet lointain","un lieu","une quantité"],"-ci = près; -là = loin.")

# possessive-adjectives
M('possessive-adjectives',1,"Complétez : « C'est ___ livre. » (à moi)","mon",["ma","mes","son"],"Livre est masculin → mon.")
M('possessive-adjectives',1,"Complétez : « Voici ___ sœur. » (à toi)","ta",["ton","tes","sa"],"Sœur est féminin → ta.")
M('possessive-adjectives',2,"Complétez : « Paul aime ___ mère. » (la mère de Paul)","sa",["son","ses","leur"],"Mère est féminin singulier → sa.")
M('possessive-adjectives',2,"Complétez : « Nous aimons ___ professeur. » (à nous)","notre",["nos","votre","leur"],"Notre devant un nom singulier.")
M('possessive-adjectives',3,"Complétez : « Elle a perdu ___ amie. » (amie → voyelle)","son",["sa","ses","leur"],"Devant une voyelle, on emploie mon/ton/son même au féminin.")

# possessive-pronouns
M('possessive-pronouns',3,"Complétez : « Ce stylo est à moi, c'est ___ . »","le mien",["la mienne","les miens","le sien"],"Stylo est masculin singulier → le mien.")
M('possessive-pronouns',3,"Complétez : « Ta maison est grande; ___ (ma maison) est petite. »","la mienne",["le mien","les miennes","la sienne"],"Maison est féminin singulier → la mienne.")
M('possessive-pronouns',4,"Complétez : « Mes amis et ___ (tes amis) sont arrivés. »","les tiens",["le tien","les tiennes","les siens"],"Amis : masculin pluriel → les tiens.")
M('possessive-pronouns',4,"Quelle phrase est correcte ?","Voici mon sac; où est le tien ?",["Voici mon sac; où est ton ?","Voici mon sac; où est tien ?","Voici mon sac; où est la tienne ?"],"Pronom possessif = article + tien/tienne.")
M('possessive-pronouns',4,"Complétez : « Leurs enfants et ___ (nos enfants) jouent ensemble. »","les nôtres",["le nôtre","les nôtre","les vôtres"],"Pluriel → les nôtres (accent circonflexe).")

# subjonctif-formation (computed)
S='subjonctif'
def F(skill,d,s,v,pron,g='m',kind='mcq'): Q.append(fill(skill,d,s,v,S,'présent',pron,g,kind))
F('subjonctif-formation',2,"Il faut que je ___ mes devoirs.",'finir','je')
F('subjonctif-formation',2,"Il est nécessaire que tu ___ plus tôt.",'partir','tu')
F('subjonctif-formation',3,"Je veux que vous ___ ce livre.",'lire','vous')
F('subjonctif-formation',3,"Il faut que nous ___ à l'heure.",'arriver','nous')
F('subjonctif-formation',3,"Il faut qu'ils ___ la vérité.",'dire','ils')
# subjonctif-irregular
F('subjonctif-irregular',3,"Il faut que je ___ à l'école.",'aller','je')
F('subjonctif-irregular',3,"Je veux que tu ___ gentil.",'être','tu')
F('subjonctif-irregular',3,"Il faut que nous ___ patience.",'avoir','nous')
F('subjonctif-irregular',4,"Il faut qu'elle ___ son travail.",'faire','elle')
F('subjonctif-irregular',4,"Il est nécessaire que vous ___ la réponse.",'savoir','vous')
F('subjonctif-irregular',4,"Je souhaite qu'ils ___ venir.",'pouvoir','ils')
# subjonctif-triggers
M('subjonctif-triggers',2,"Quelle expression est suivie du subjonctif ?","il faut que",["je pense que","il dit que","je sais que"],"Il faut que + subjonctif.")
M('subjonctif-triggers',2,"Complétez : « Je souhaite que tu ___ heureux. »","sois",["es","seras","étais"],"Souhaiter que + subjonctif.")
M('subjonctif-triggers',3,"Quelle phrase est correcte ?","Il faut que je parte.",["Il faut que je pars.","Il faut que je partirai.","Il faut que je partais."],"Après il faut que → subjonctif.")
M('subjonctif-triggers',3,"Complétez : « Je veux que vous ___ ici. »","soyez",["êtes","serez","étiez"],"Vouloir que + subjonctif.")
M('subjonctif-triggers',3,"Après quelle expression utilise-t-on l'indicatif ?","je sais que",["il faut que","il est nécessaire que","je souhaite que"],"Savoir que + indicatif (certitude).")

if __name__ == '__main__':
    import sys; L.write(sys.argv[1], 'french', Q)
