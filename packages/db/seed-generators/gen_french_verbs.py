# v123: French verb-skill questions (original, written for Sahayak). Verb forms in answer keys are computed with verbecc via fr_lib.
import fr_lib as L
from fr_lib import mcq, short, fill
Q = []
I, P = 'indicatif', 'présent'
def F(skill, d, s, v, mood, tense, pron, g='m', kind='mcq', **k): Q.append(fill(skill, d, s, v, mood, tense, pron, g, kind, **k))

# present-tense
F('present-tense',1,"Nous ___ notre travail à huit heures.",'commencer',I,P,'nous')
F('present-tense',1,"Tu ___ toujours très gentil avec tes camarades.",'être',I,P,'tu')
F('present-tense',1,"Les enfants ___ au parc après l'école.",'aller',I,P,'ils')
F('present-tense',2,"Vous ___ du thé ou du café ?",'prendre',I,P,'vous')
F('present-tense',2,"Je ___ mes devoirs avant le dîner.",'finir',I,P,'je')
F('present-tense',2,"Elle ___ une lettre à son ami français.",'écrire',I,P,'elle')
F('present-tense',3,"Ils ___ le journal tous les matins.",'lire',I,P,'ils')
F('present-tense',3,"Vous ___ la vérité.",'dire',I,P,'vous')
F('present-tense',3,"Nous ___ beaucoup de lettres cette semaine.",'recevoir',I,P,'nous')
F('present-tense',2,"On ___ à la bibliothèque le samedi.",'aller',I,P,'on')
F('present-tense',3,"Mes parents ___ de la musique le soir.",'écouter',I,P,'ils',kind='short')

# pronominal-verbs
F('pronominal-verbs',1,"Je ___ à six heures chaque matin.",'se lever',I,P,'je')
F('pronominal-verbs',1,"Tu ___ toujours très tard.",'se coucher',I,P,'tu')
F('pronominal-verbs',2,"Nous ___ dans le jardin le dimanche.",'se promener',I,P,'nous')
F('pronominal-verbs',2,"Elle ___ avant d'aller à l'école.",'s\'habiller',I,P,'elle')
F('pronominal-verbs',2,"Vous ___ à quelle heure ?",'se réveiller',I,P,'vous')
Q.append(mcq('pronominal-verbs',3,"Quelle phrase est correcte ?","Ils se lavent les mains avant le repas.",["Ils lavent se les mains avant le repas.","Ils se lave les mains avant le repas.","Ils nous lavent les mains avant le repas."],"Le verbe pronominal garde son pronom réfléchi devant le verbe : ils se lavent."))
Q.append(mcq('pronominal-verbs',3,"Quel pronom complète la phrase ? « Nous ___ intéressons à la musique. »","nous",["se","me","vous"],"Avec « nous », le pronom réfléchi est « nous » : nous nous intéressons."))

# imperative
for (v,p,s,d) in [('finir','tu',"Tu finis vite ton travail.",1),('aller','vous',"Vous allez à la poste.",2),('prendre','nous',"Nous prenons un taxi.",2),('écouter','tu',"Tu écoutes la radio.",1),('faire','vous',"Vous faites attention.",2)]:
    ans=L.imper(v,p); 
    pool=[L.bare(L.conj(v,I,P,q)) for q in ['je','il','ils','nous','vous','tu']]+[v,L.part(v)]
    wr=[x for x in dict.fromkeys(pool) if x!=ans][:3]
    Q.append(mcq('imperative',d,f"Mettez à l'impératif : « {s} »",ans,wr[:3],f"À l'impératif ({p}) : {ans}."))
Q.append(mcq('imperative',3,"Quelle phrase donne un ordre poli à un professeur (vous) ?","Ouvrez la fenêtre, s'il vous plaît.",["Tu ouvres la fenêtre, s'il vous plaît.","Ouvrir tu la fenêtre, s'il vous plaît.","Vous ouvriez la fenêtre, s'il vous plaît."],"L'impératif de « vous » : ouvrez. Pas de pronom sujet."))
Q.append(mcq('imperative',3,"Complétez à l'impératif négatif : « ___ pas en retard ! » (tu, être)","Ne sois",["Ne es","Ne être","Ne soyez"],"Impératif irrégulier de être : sois, soyons, soyez. Négation : ne sois pas."))

# infinitive-use
Q.append(mcq('infinitive-use',1,"Complétez : « J'aime ___ des romans. »","lire",["lis","lisez","lu"],"Après aimer, on met un verbe à l'infinitif : aimer lire."))
Q.append(mcq('infinitive-use',2,"Complétez : « Il faut ___ ses devoirs. »","faire",["fait","faites","faisons"],"Après « il faut », on emploie l'infinitif."))
Q.append(mcq('infinitive-use',2,"Complétez : « Nous allons ___ le film ce soir. »","voir",["vu","voyons","vois"],"Le futur proche : aller + infinitif."))
Q.append(mcq('infinitive-use',3,"Complétez : « Elle veut ___ médecin. »","devenir",["devient","devenue","devenons"],"Vouloir + infinitif : elle veut devenir médecin."))
Q.append(mcq('infinitive-use',3,"Quelle phrase est correcte ?","Je ne peux pas venir demain.",["Je ne peux pas viens demain.","Je ne peux pas venu demain.","Je ne pouvons pas venir demain."],"Pouvoir + infinitif : « venir »."))

# passe-compose-auxiliary
Q.append(mcq('passe-compose-auxiliary',1,"Complétez au passé composé : « Hier, j'___ un gâteau. » (manger)","ai mangé",["suis mangé","ai manger","avais mangé"],"Manger se conjugue avec avoir : j'ai mangé.", 'GRAMMAR_RULE'))
Q.append(mcq('passe-compose-auxiliary',2,"Complétez : « Elle ___ au cinéma samedi. » (aller)","est allée",["a allé","a allée","est allé"],"Aller se conjugue avec être : elle est allée."))
Q.append(mcq('passe-compose-auxiliary',2,"Quel auxiliaire convient pour « sortir » (sans complément d'objet) ?","être",["avoir","aller","faire"],"Sortir, partir, arriver, entrer, aller, venir se conjuguent avec être au passé composé."))
F('passe-compose-auxiliary',3,"Hier soir, nous ___ très tard.",'se coucher','indicatif','passé-composé','nous')
F('passe-compose-auxiliary',3,"Tu ___ tes clés ?",'perdre','indicatif','passé-composé','tu')
F('passe-compose-auxiliary',2,"Ils ___ à Paris en 2022.",'arriver','indicatif','passé-composé','ils')

# passe-compose-agreement
Q.append(mcq('passe-compose-agreement',2,"Complétez : « Marie est ___ à Paris. » (partir)","partie",["parti","partis","parties"],"Avec être, le participe s'accorde avec le sujet : Marie → partie."))
Q.append(mcq('passe-compose-agreement',2,"Complétez : « Les garçons sont ___ en retard. » (arriver)","arrivés",["arrivé","arrivées","arrivée"],"Sujet masculin pluriel : arrivés."))
Q.append(mcq('passe-compose-agreement',3,"Complétez : « Les lettres que j'ai ___ sont longues. » (écrire)","écrites",["écrit","écrite","écrits"],"Avec avoir, le participe s'accorde avec le COD placé avant : les lettres → écrites."))
Q.append(mcq('passe-compose-agreement',3,"Quelle phrase est correcte ?","Elle a mangé une pomme.",["Elle a mangée une pomme.","Elle est mangé une pomme.","Elle a mangés une pomme."],"Avec avoir, pas d'accord si le COD est placé après le verbe."))
Q.append(mcq('passe-compose-agreement',4,"Complétez : « Ma sœur et moi, nous sommes ___ au musée. » (aller, deux filles)","allées",["allé","allés","allée"],"Nous représente deux filles → féminin pluriel : allées."))

# imparfait
F('imparfait',1,"Quand j'étais petit, nous ___ chez mes grands-parents.",'habiter','indicatif','imparfait','nous')
F('imparfait',1,"Autrefois, il ___ à pied à l'école.",'aller','indicatif','imparfait','il')
F('imparfait',2,"Pendant les vacances, vous ___ tôt.",'se lever','indicatif','imparfait','vous')
F('imparfait',2,"Je ___ souvent des bandes dessinées à dix ans.",'lire','indicatif','imparfait','je')
F('imparfait',2,"Il y a dix ans, ils ___ à Lyon.",'vivre','indicatif','imparfait','ils')
F('imparfait',3,"Quand tu ___ petite, tu aimais le chocolat.",'être','indicatif','imparfait','tu')

# imparfait-vs-passe-compose
Q.append(mcq('imparfait-vs-passe-compose',2,"Complétez : « Il pleuvait quand je ___ de la maison. »","suis sorti",["sortais","sors","sortirai"],"Action ponctuelle → passé composé; la pluie est le décor → imparfait.",'GRAMMAR_RULE'))
Q.append(mcq('imparfait-vs-passe-compose',3,"Quelle phrase décrit une habitude passée ?","Chaque été, nous allions à la mer.",["Hier, nous sommes allés à la mer.","Un jour, nous allons à la mer.","Nous irons à la mer demain."],"L'imparfait exprime une habitude dans le passé."))
Q.append(mcq('imparfait-vs-passe-compose',3,"Complétez : « Pendant que je ___ , le téléphone a sonné. » (lire)","lisais",["ai lu","lirai","lis"],"Action en cours (imparfait) interrompue par une autre (passé composé)."))
Q.append(mcq('imparfait-vs-passe-compose',4,"Choisissez la bonne suite : « Il était huit heures quand elle ___ la porte. »","a ouvert",["ouvrait","ouvrira","ouvre"],"Un événement précis et terminé → passé composé."))
Q.append(mcq('imparfait-vs-passe-compose',4,"Complétez : « Le ciel ___ bleu et les oiseaux chantaient. » (être)","était",["a été","sera","est"],"On décrit une situation dans le passé → imparfait."))

# plus-que-parfait
for s,v,pr,d,g in [("Quand je suis arrivé, elle ___ déjà ___ . (partir)","partir",'elle',2,'m')]: pass
F('plus-que-parfait',2,"J'___ déjà fini quand il est arrivé.",'finir','indicatif','plus-que-parfait','je')
F('plus-que-parfait',2,"Nous ___ déjà mangé quand tu as téléphoné.",'manger','indicatif','plus-que-parfait','nous')
F('plus-que-parfait',3,"Elle ___ déjà ___ quand je suis arrivé.",'partir','indicatif','plus-que-parfait','elle',hint="Mettez au plus-que-parfait (écrivez les deux mots du verbe, auxiliaire + participe) :")
F('plus-que-parfait',3,"Ils ___ lu le livre avant le film.",'avoir','indicatif','plus-que-parfait','ils') if False else None
F('plus-que-parfait',3,"Tu ___ déjà vu ce film ?",'voir','indicatif','plus-que-parfait','tu')
F('plus-que-parfait',4,"Vous ___ oublié vos clés.",'oublier','indicatif','plus-que-parfait','vous')

# futur-proche
Q.append(mcq('futur-proche',1,"Choisissez le futur proche : ","Je vais manger.",["Je mange.","J'ai mangé.","Je mangerais."],"Futur proche = aller (au présent) + infinitif."))
Q.append(mcq('futur-proche',1,"Complétez : « Demain, nous ___ visiter le musée. »","allons",["allions","irons","sommes allés"],"Futur proche : nous allons + infinitif."))
Q.append(mcq('futur-proche',2,"Complétez : « Ils ___ partir à six heures. »","vont",["va","vais","allez"],"Aller au présent avec ils : vont."))
Q.append(mcq('futur-proche',2,"Transformez au futur proche : « Elle téléphone à sa mère. »","Elle va téléphoner à sa mère.",["Elle téléphonera sa mère.","Elle est téléphoné à sa mère.","Elle allait téléphoné à sa mère."],"aller + infinitif : elle va téléphoner."))
Q.append(mcq('futur-proche',3,"Complétez : « Tu ___ bientôt ___ ton examen. » (passer)","vas / passer",["as / passé","vais / passes","vas / passé"],"Futur proche : vas + passer."))

# futur-simple
F('futur-simple',1,"Demain, je ___ à la bibliothèque.",'aller','indicatif','futur-simple','je')
F('futur-simple',2,"L'année prochaine, nous ___ en France.",'voyager','indicatif','futur-simple','nous')
F('futur-simple',2,"Tu ___ ton examen avec succès.",'réussir','indicatif','futur-simple','tu')
F('futur-simple',2,"Elle ___ médecin.",'être','indicatif','futur-simple','elle')
F('futur-simple',3,"Vous ___ un cadeau demain.",'recevoir','indicatif','futur-simple','vous')
F('futur-simple',3,"Ils ___ le travail avant le week-end.",'faire','indicatif','futur-simple','ils')

# futur-anterieur
F('futur-anterieur',3,"Quand tu ___ tes devoirs, tu pourras jouer.",'finir','indicatif','futur-antérieur','tu')
F('futur-anterieur',3,"Dès qu'elle ___ , elle appellera.",'arriver','indicatif','futur-antérieur','elle')
F('futur-anterieur',4,"Demain à cette heure, j'___ passé l'examen.",'avoir','indicatif','futur-antérieur','je') if False else None
F('futur-anterieur',4,"Nous ___ le livre avant la fin du mois.",'lire','indicatif','futur-antérieur','nous')
F('futur-anterieur',4,"Quand vous ___ de l'école, vous aurez des amis.",'sortir','indicatif','futur-antérieur','vous')
Q.append(mcq('futur-anterieur',3,"Quand utilise-t-on le futur antérieur ?","Pour une action terminée avant une autre action future.",["Pour une habitude passée.","Pour un ordre.","Pour un souhait irréel dans le présent."],"Futur antérieur = action future accomplie avant un autre repère futur."))

# conditionnel-present
F('conditionnel-present',2,"Je ___ bien un café, s'il vous plaît.",'prendre','conditionnel','présent','je')
F('conditionnel-present',2,"À ta place, je ne ___ pas.",'partir','conditionnel','présent','je')
F('conditionnel-present',3,"Nous ___ plus d'argent, nous voyagerions.",'avoir','indicatif','imparfait','nous') if False else None
F('conditionnel-present',3,"Ils ___ aller à la mer.",'vouloir','conditionnel','présent','ils')
F('conditionnel-present',3,"Tu ___ me prêter ton stylo ?",'pouvoir','conditionnel','présent','tu')
F('conditionnel-present',4,"Elle ___ contente de te voir.",'être','conditionnel','présent','elle')

# si-clauses
Q.append(mcq('si-clauses',2,"Complétez : « Si tu travailles, tu ___ ton examen. »","réussiras",["réussirais","réussissais","as réussi"],"Si + présent → futur simple."))
Q.append(mcq('si-clauses',3,"Complétez : « Si j'avais le temps, je ___ voyager. »","pourrais",["pourrai","peux","pouvais"],"Si + imparfait → conditionnel présent."))
Q.append(mcq('si-clauses',3,"Quelle phrase est correcte ?","S'il pleut, nous resterons à la maison.",["S'il pleuvra, nous resterons à la maison.","S'il pleuvrait, nous resterons à la maison.","S'il pleut, nous resterions à la maison."],"Après « si », on n'emploie pas le futur ni le conditionnel."))
Q.append(mcq('si-clauses',4,"Complétez : « Si nous ___ plus tôt, nous arriverions à l'heure. » (partir)","partions",["partirons","partirions","partons"],"Si + imparfait → conditionnel présent dans la principale."))
Q.append(mcq('si-clauses',4,"Complétez : « Je t'aiderais si tu me ___ . » (demander)","demandais",["demanderais","demanderas","demandes"],"Après « si » on emploie l'imparfait, pas le conditionnel."))

if __name__ == '__main__':
    Q = [q for q in Q if q]
    import sys; L.write(sys.argv[1], 'french', Q)
