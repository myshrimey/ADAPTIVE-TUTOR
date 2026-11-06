# v105: Science. 40 questions for the 8 new skills (Heredity, Human Eye, Our Environment) + 24 for the thinnest existing skills.
# Original, multiple choice; facts limited to standard NCERT points. Every question is needs_review (Science is 'ready', so this is stated per question).
import os
from v104_lib import mcq, write
SEED = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'seed')
Q = []; A = Q.append
T, C, AP, PG = 'TERMINOLOGY_CONFUSION', 'CONCEPT_CONFUSION', 'APPLICATION_GAP', 'PREREQUISITE_GAP'

s='sci-mendel-ratios'
A(mcq(s,1,'Mendel carried out his famous experiments on which plant?','Garden pea',['Mango','Rose','Wheat'],'Mendel crossed varieties of the garden pea (Pisum sativum) and counted the traits in each generation.',PG))
A(mcq(s,2,'A pure tall pea plant (TT) is crossed with a pure dwarf plant (tt). What are the F1 plants?','All tall',['All dwarf','Half tall, half dwarf','Three tall to one dwarf'],'Every F1 plant is Tt. Tallness is dominant, so all of them look tall.',C))
A(mcq(s,2,'When F1 plants (Tt) are self-pollinated, the ratio of tall to dwarf plants in F2 is:','3 : 1',['1 : 1','1 : 3','2 : 1'],'Tt x Tt gives TT, Tt, Tt, tt: three tall and one dwarf.',C))
A(mcq(s,3,'Out of 400 F2 plants from a Tt x Tt cross, about how many are expected to be dwarf?','100',['200','300','133'],'One quarter (tt) are dwarf: 400 / 4 = 100.',AP))
A(mcq(s,3,'Round yellow (RRYY) pea plants are crossed with wrinkled green (rryy) plants, and the F1 plants are self-pollinated. The phenotypic ratio in F2 is:','9 : 3 : 3 : 1',['3 : 1','1 : 2 : 1','1 : 1 : 1 : 1'],'A dihybrid cross gives four kinds of offspring in the ratio 9 : 3 : 3 : 1.',PG))

s='sci-dominant-recessive'
A(mcq(s,1,'A trait that shows up in the F1 generation when the parents have contrasting traits is called:','Dominant',['Recessive','Acquired','Mutated'],'The dominant trait is expressed even when only one copy of the gene is present.',T))
A(mcq(s,2,'The genetic makeup of an organism, such as Tt, is called its:','Genotype',['Phenotype','Species','Habitat'],'Genotype is the pair of genes; phenotype is the visible trait.',T))
A(mcq(s,2,'A plant with genotype Tt looks tall. Its phenotype is:','Tall',['Tt','Dwarf','Hybrid seed'],'The phenotype is what you can see: tall.',T))
A(mcq(s,3,'Which cross gives tall and dwarf offspring in a 1 : 1 ratio?','Tt x tt',['TT x tt','Tt x Tt','TT x Tt'],'Half the offspring get T from the Tt parent (tall Tt), half get t (dwarf tt).',AP))
A(mcq(s,3,'A trait that is acquired during a person\'s life, such as a cut tail in rats, is:','Not passed on to the next generation',['Always passed on','Passed on as a dominant trait','Passed on as a recessive trait'],'Only changes in the DNA of reproductive cells are inherited. Acquired traits are not.',C))

s='sci-sex-determination'
A(mcq(s,1,'How many pairs of chromosomes does a normal human cell have?','23',['22','46 pairs','12'],'Humans have 23 pairs (46 chromosomes): 22 pairs of autosomes and one pair of sex chromosomes.',PG))
A(mcq(s,2,'Which pair of sex chromosomes does a human female have?','XX',['XY','YY','XO'],'Females have two X chromosomes, males have one X and one Y.',T))
A(mcq(s,2,'The sex of a human child is decided by the chromosome contributed by:','The father',['The mother','Both equally','The doctor'],'Every egg carries X. A sperm carries either X (girl) or Y (boy).',C))
A(mcq(s,2,'What is the chance that a couple\'s child is a boy?','50 per cent',['25 per cent','75 per cent','100 per cent'],'Half the sperms carry Y and half carry X, so each child has an equal chance.',AP))
A(mcq(s,3,'A sperm carrying a Y chromosome fertilises an egg. The child will be:','A boy',['A girl','Sex cannot be known','Either, decided later'],'Egg X + sperm Y gives XY, which is male.',AP))

s='sci-eye-parts'
A(mcq(s,1,'Which part of the human eye controls the amount of light entering it?','Iris',['Retina','Cornea','Optic nerve'],'The iris changes the size of the pupil to control the light.',T))
A(mcq(s,1,'Where is the image formed in a normal human eye?','On the retina',['On the lens','On the cornea','On the iris'],'The retina has light-sensitive cells that send signals to the brain along the optic nerve.',C))
A(mcq(s,2,'Most of the bending (refraction) of light entering the eye happens at the:','Outer surface of the cornea',['Retina','Iris','Optic nerve'],'The cornea does most of the refraction. The lens adjusts it finely.',C))
A(mcq(s,2,'The ability of the eye lens to change its focal length to see near and far objects is called:','Accommodation',['Dispersion','Scattering','Reflection'],'Ciliary muscles change the curvature of the lens.',T))
A(mcq(s,3,'When we look at a NEAR object, the ciliary muscles:','Contract, making the lens thicker',['Relax, making the lens thinner','Stay unchanged','Move the retina forward'],'A thicker lens has a shorter focal length, needed to focus nearby objects.',C))

s='sci-vision-defects'
A(mcq(s,1,'A person who can see nearby objects clearly but not distant ones has:','Myopia (near-sightedness)',['Hypermetropia','Cataract','Colour blindness'],'In myopia the image forms in front of the retina.',T))
A(mcq(s,2,'Myopia is corrected by using a:','Concave lens',['Convex lens','Plane mirror','Prism'],'A concave (diverging) lens moves the image back onto the retina.',AP))
A(mcq(s,2,'Hypermetropia (far-sightedness) is corrected by using a:','Convex lens',['Concave lens','Plane mirror','Cylindrical prism only'],'A convex (converging) lens brings the image forward onto the retina.',AP))
A(mcq(s,2,'The near point of a normal human eye is about:','25 cm',['2.5 cm','250 cm','Infinity'],'The least distance of distinct vision is about 25 cm.',PG))
A(mcq(s,3,'Cloudiness of the eye lens, common in old age, that can be removed by surgery is called:','Cataract',['Myopia','Hypermetropia','Presbyopia'],'Cataract makes vision blurred and is treated by replacing the lens.',T))

s='sci-dispersion-scattering'
A(mcq(s,1,'Splitting of white light into its seven colours by a prism is called:','Dispersion',['Reflection','Scattering','Diffraction of sound'],'Different colours bend by different amounts, so they spread out.',T))
A(mcq(s,2,'Which colour bends the LEAST when white light passes through a glass prism?','Red',['Violet','Blue','Green'],'Red has the longest wavelength and bends least; violet bends most.',C))
A(mcq(s,2,'The sky looks blue mainly because:','Air molecules scatter blue light more than red',['The sea reflects its colour','Blue light is made by the Sun alone','Red light is absorbed by clouds'],'Shorter wavelengths (blue) are scattered more strongly by the very small particles in air.',C))
A(mcq(s,2,'The Sun appears reddish at sunrise and sunset because:','Light travels a longer path and most blue light is scattered away',['The Sun cools down','The Earth tilts','Red light is made at the horizon'],'Near the horizon sunlight crosses more air, so only the less scattered red part reaches us.',C))
A(mcq(s,3,'A rainbow is formed by:','Dispersion, refraction and internal reflection of sunlight in water droplets',['Scattering of sunlight by dust only','Reflection from clouds','Diffraction around mountains'],'Droplets act like tiny prisms. You must have the Sun behind you.',C))

s='sci-food-chain-energy'
A(mcq(s,1,'In a food chain, green plants are called:','Producers',['Consumers','Decomposers','Carnivores'],'Producers make their own food by photosynthesis.',T))
A(mcq(s,2,'According to the 10 per cent law, how much of the energy at one trophic level passes to the next?','About 10 per cent',['About 90 per cent','All of it','About 50 per cent'],'The rest is lost as heat or used in life processes.',C))
A(mcq(s,2,'In the chain grass -> grasshopper -> frog -> snake -> hawk, the hawk is a:','Top (tertiary) consumer',['Producer','Primary consumer','Decomposer'],'It sits at the highest level of this chain; the grasshopper is the primary consumer.',T))
A(mcq(s,3,'If the grass in a chain holds 10000 J of energy, about how much reaches the third trophic level (grass -> deer -> lion)?','100 J',['1000 J','10 J','5000 J'],'10000 -> 1000 J in the deer -> 100 J in the lion.',AP))
A(mcq(s,3,'Why are food chains usually short, with 3 or 4 steps?','Energy is lost at each step, so little is left for higher levels',['Animals do not like to eat each other','Sunlight is too weak','Predators die quickly'],'Only about 10 per cent is passed on, so very long chains would run out of energy.',C))

s='sci-ozone-waste'
A(mcq(s,1,'The ozone layer protects living things from:','Harmful ultraviolet rays of the Sun',['Rain','Infrared heat','Sound waves'],'Ozone absorbs most of the harmful UV radiation.',C))
A(mcq(s,2,'Which chemicals used in refrigerators and aerosol sprays damage the ozone layer?','Chlorofluorocarbons (CFCs)',['Carbon dioxide','Nitrogen','Methane only'],'CFCs release chlorine in the upper atmosphere, which breaks down ozone.',T))
A(mcq(s,2,'Which of these is a biodegradable waste?','Vegetable peels',['Plastic bags','Glass bottles','Aluminium cans'],'Biodegradable wastes are broken down by bacteria and fungi.',T))
A(mcq(s,2,'Which of these is non-biodegradable?','Polythene',['Cotton cloth','Paper','Cow dung'],'Plastics stay in the environment for a very long time.',T))
A(mcq(s,3,'Harmful chemicals such as pesticides build up to the highest level in the bodies of:','Top carnivores in the food chain',['Producers','Herbivores','Decomposers'],'This is biological magnification: the concentration rises at each higher level.',C))

# ---------- thin existing skills
s='compare-respiration-types'
A(mcq(s,1,'In which part of the cell does aerobic respiration release most of its energy?','Mitochondria',['Nucleus','Ribosome','Cell wall'],'Mitochondria are called the powerhouses of the cell.',T))
A(mcq(s,2,'When muscles work hard and oxygen is short, glucose is broken down to:','Lactic acid',['Ethanol','Carbon dioxide only','Water only'],'Lactic acid build-up causes cramps.',C))
A(mcq(s,2,'The first step of breaking down glucose into pyruvate occurs in the:','Cytoplasm',['Mitochondria','Nucleus','Chloroplast'],'It happens in the cytoplasm in all organisms. What follows depends on whether oxygen is available.',PG))
A(mcq(s,2,'Which statement about aerobic and anaerobic respiration is correct?','Aerobic releases more energy per glucose than anaerobic',['Anaerobic releases more energy','They release equal energy','Anaerobic needs oxygen'],'Complete breakdown with oxygen releases far more energy.',C))
A(mcq(s,3,'Which pair shows the products of anaerobic respiration in yeast?','Ethanol and carbon dioxide',['Lactic acid and water','Water and carbon dioxide','Glucose and oxygen'],'Yeast ferments sugar to ethanol and carbon dioxide, which makes dough rise.',C))

s='describe-reflex-action-pathway'
A(mcq(s,1,'The pathway of a reflex action from receptor to effector is called a:','Reflex arc',['Nerve cell','Brain wave','Synapse'],'Receptor, sensory neuron, spinal cord, motor neuron, effector.',T))
A(mcq(s,2,'Which is the correct order for a reflex arc?','Receptor, sensory neuron, spinal cord, motor neuron, effector',['Effector, motor neuron, spinal cord, receptor','Receptor, brain, effector','Spinal cord, receptor, effector'],'Information goes in through the sensory neuron and out through the motor neuron.',C))
A(mcq(s,2,'The gap between two neurons where the impulse passes by a chemical is called a:','Synapse',['Axon','Dendrite','Myelin'],'Chemicals cross the synapse to start an impulse in the next neuron.',T))
A(mcq(s,2,'Which of these is a reflex action?','Pulling the hand away from a hot object',['Reciting a poem','Riding a bicycle','Writing an exam'],'Reflexes are quick, automatic responses.',C))
A(mcq(s,3,'In many reflexes the response is quick because the signal:','Goes through the spinal cord without waiting for the brain',['Is slowed by the heart','Goes only through the stomach','Is chosen by thinking'],'Taking the shorter spinal-cord pathway saves time.',C))

s='identify-plant-hormone-response'
A(mcq(s,1,'Which plant hormone helps cells grow longer and makes shoots bend towards light?','Auxin',['Abscisic acid','Cytokinin','Ethylene'],'Auxin collects on the shaded side, making those cells longer.',T))
A(mcq(s,1,'Which plant hormone helps fruits ripen?','Ethylene',['Auxin','Gibberellin','Cytokinin'],'Ethylene is a gaseous hormone that speeds up ripening.',T))
A(mcq(s,2,'Which hormone promotes cell division, for example in fruits and seeds?','Cytokinin',['Abscisic acid','Auxin only','Ethylene'],'Cytokinin is found in areas of rapid division.',T))
A(mcq(s,2,'Which hormone inhibits growth and causes wilting of leaves?','Abscisic acid',['Gibberellin','Auxin','Cytokinin'],'Abscisic acid slows growth and helps plants deal with stress.',T))
A(mcq(s,2,'Which hormone helps the stem to grow longer?','Gibberellin',['Abscisic acid','Ethylene','Insulin'],'Gibberellins help stem growth and seed germination.',T))
A(mcq(s,2,'The growth of roots downwards towards gravity is called:','Geotropism',['Phototropism','Hydrotropism','Chemotropism'],'Roots show positive geotropism.',T))

s='explain-covalent-bonding'
A(mcq(s,1,'A covalent bond is formed by:','Sharing of electrons',['Transfer of electrons','Loss of protons','Melting of atoms'],'Atoms of non-metals share electrons to complete their outer shells.',C))
A(mcq(s,2,'How many electrons are shared in a double bond?','4 (two pairs)',['2','6','1'],'A double bond has two shared pairs; a triple bond has three.',C))
A(mcq(s,2,'Which molecule has a triple bond?','Nitrogen (N2)',['Hydrogen (H2)','Oxygen (O2)','Chlorine (Cl2)'],'Each nitrogen needs three more electrons, so they share three pairs.',C))
A(mcq(s,3,'Compared with ionic compounds, covalent compounds usually have:','Lower melting and boiling points',['Higher melting points','Good electrical conduction','No bonds'],'The forces between covalent molecules are weak.',C))

s='apply-right-hand-thumb-rule'
A(mcq(s,1,'In the right-hand thumb rule for a straight wire, the thumb shows the direction of:','Current',['Magnetic field','Force','Resistance'],'The curled fingers then show the direction of the magnetic field lines.',T))
A(mcq(s,2,'The magnetic field lines around a straight current-carrying wire are:','Concentric circles around the wire',['Straight lines parallel to the wire','Straight lines away from the wire','Absent'],'Their direction follows the right-hand thumb rule.',C))
A(mcq(s,2,'If the current in a straight wire is reversed, the magnetic field:','Reverses its direction',['Stays the same','Disappears','Doubles'],'Direction of the field depends on the direction of the current.',C))
A(mcq(s,3,'As you move away from a straight current-carrying wire, the magnetic field strength:','Decreases',['Increases','Stays constant','Becomes zero at once'],'Field lines get farther apart as the distance from the wire increases.',C))

for q in Q: q['content_status'] = 'needs_review'
write(os.path.join(SEED, 'cbse-class10-science-v105-diagnostic.json'), 'science', Q)
