/**
 * Local IBS food knowledge (Layer 1).
 * Server-side only — expand by appending records to IBS_FOOD_KNOWLEDGE.
 */

export type KnowledgeFodmapLevel = "Low" | "Moderate" | "High" | "Unknown";

export type IbsFoodRecord = {
  canonicalName: string;
  aliases: string[];
  fodmapLevel: KnowledgeFodmapLevel;
  fodmapGroups: string[];
  baseRiskScore: number;
  commonConcerns: string[];
  positiveFactors: string[];
  saferAlternatives: string[];
  portionSensitive: boolean;
  notes: string;
};

export const IBS_FOOD_KNOWLEDGE_VERSION = "1.0.0";

const PORTION_NOTE =
  "Individual tolerance varies; portion size and preparation may change how someone responds.";

function food(record: Omit<IbsFoodRecord, "notes"> & { notes?: string }): IbsFoodRecord {
  return {
    notes: PORTION_NOTE,
    ...record,
  };
}

export const IBS_FOOD_KNOWLEDGE: IbsFoodRecord[] = [
  food({ canonicalName: "rice", aliases: ["rice", "white rice", "brown rice", "basmati", "jasmine rice", "steamed rice"], fodmapLevel: "Low", fodmapGroups: [], baseRiskScore: 4, commonConcerns: [], positiveFactors: ["Often well tolerated as a gentle starch"], saferAlternatives: [], portionSensitive: true }),
  food({ canonicalName: "oats", aliases: ["oats", "oatmeal", "rolled oats", "porridge"], fodmapLevel: "Low", fodmapGroups: [], baseRiskScore: 6, commonConcerns: ["Large portions may feel heavy for some people"], positiveFactors: ["Can be a gentle fibre source in modest portions"], saferAlternatives: [], portionSensitive: true }),
  food({ canonicalName: "wheat", aliases: ["wheat", "whole wheat", "wholemeal", "atta", "flour"], fodmapLevel: "High", fodmapGroups: ["Fructans"], baseRiskScore: 22, commonConcerns: ["May contain fructans"], positiveFactors: [], saferAlternatives: ["rice", "oats", "gluten-free bread"], portionSensitive: true }),
  food({ canonicalName: "chapati", aliases: ["chapati", "chapatti", "roti", "phulka"], fodmapLevel: "Moderate", fodmapGroups: ["Fructans"], baseRiskScore: 16, commonConcerns: ["Wheat-based flatbread may contain fructans"], positiveFactors: [], saferAlternatives: ["rice roti", "smaller wheat portion"], portionSensitive: true }),
  food({ canonicalName: "bread", aliases: ["bread", "white bread", "whole wheat bread", "toast", "sandwich bread"], fodmapLevel: "High", fodmapGroups: ["Fructans"], baseRiskScore: 20, commonConcerns: ["Wheat bread is often higher in fructans"], positiveFactors: [], saferAlternatives: ["sourdough (small portion)", "gluten-free bread"], portionSensitive: true }),
  food({ canonicalName: "pasta", aliases: ["pasta", "spaghetti", "noodles", "macaroni", "penne"], fodmapLevel: "High", fodmapGroups: ["Fructans"], baseRiskScore: 21, commonConcerns: ["Wheat pasta may contain fructans"], positiveFactors: [], saferAlternatives: ["rice noodles", "gluten-free pasta"], portionSensitive: true }),
  food({ canonicalName: "onion", aliases: ["onion", "onions", "brown onion", "red onion", "spring onion", "scallion"], fodmapLevel: "High", fodmapGroups: ["Fructans"], baseRiskScore: 24, commonConcerns: ["Often high in fructans"], positiveFactors: [], saferAlternatives: ["green onion tops (small amount)", "onion-infused oil"], portionSensitive: true }),
  food({ canonicalName: "garlic", aliases: ["garlic", "garlic cloves", "fresh garlic", "garlic powder"], fodmapLevel: "High", fodmapGroups: ["Fructans"], baseRiskScore: 24, commonConcerns: ["Often high in fructans"], positiveFactors: [], saferAlternatives: ["garlic-infused oil"], portionSensitive: true }),
  food({ canonicalName: "garlic-infused oil", aliases: ["garlic infused oil", "garlic-infused oil", "garlic oil"], fodmapLevel: "Low", fodmapGroups: [], baseRiskScore: 5, commonConcerns: [], positiveFactors: ["May provide flavour with lower fructan load than whole garlic"], saferAlternatives: [], portionSensitive: true }),
  food({ canonicalName: "milk", aliases: ["milk", "cow milk", "whole milk", "semi skimmed milk"], fodmapLevel: "High", fodmapGroups: ["Lactose"], baseRiskScore: 20, commonConcerns: ["Contains lactose for many people with IBS"], positiveFactors: [], saferAlternatives: ["lactose-free milk"], portionSensitive: true }),
  food({ canonicalName: "lactose-free milk", aliases: ["lactose free milk", "lactose-free milk", "lactose free"], fodmapLevel: "Low", fodmapGroups: [], baseRiskScore: 5, commonConcerns: [], positiveFactors: ["May be easier to tolerate than regular milk"], saferAlternatives: [], portionSensitive: true }),
  food({ canonicalName: "yoghurt", aliases: ["yoghurt", "yogurt", "greek yogurt", "greek yoghurt"], fodmapLevel: "High", fodmapGroups: ["Lactose"], baseRiskScore: 18, commonConcerns: ["May contain lactose unless labelled lactose-free"], positiveFactors: [], saferAlternatives: ["lactose-free yoghurt"], portionSensitive: true }),
  food({ canonicalName: "cheese", aliases: ["cheese", "cheddar", "mozzarella", "parmesan", "feta"], fodmapLevel: "Moderate", fodmapGroups: ["Lactose"], baseRiskScore: 12, commonConcerns: ["Hard cheeses are often lower in lactose; soft cheeses may be higher"], positiveFactors: [], saferAlternatives: ["hard aged cheese (small portion)"], portionSensitive: true }),
  food({ canonicalName: "eggs", aliases: ["egg", "eggs", "boiled egg", "fried egg", "scrambled egg"], fodmapLevel: "Low", fodmapGroups: [], baseRiskScore: 3, commonConcerns: [], positiveFactors: ["Often well tolerated protein source"], saferAlternatives: [], portionSensitive: false }),
  food({ canonicalName: "chicken", aliases: ["chicken", "grilled chicken", "roast chicken", "chicken breast"], fodmapLevel: "Low", fodmapGroups: [], baseRiskScore: 4, commonConcerns: ["Sauces and marinades may add triggers"], positiveFactors: ["Plain lean protein is often gentle"], saferAlternatives: [], portionSensitive: false }),
  food({ canonicalName: "beef", aliases: ["beef", "steak", "minced beef", "ground beef"], fodmapLevel: "Low", fodmapGroups: [], baseRiskScore: 6, commonConcerns: ["High-fat cuts may feel heavy for some people"], positiveFactors: ["Protein source when plainly prepared"], saferAlternatives: ["leaner cut", "smaller portion"], portionSensitive: true }),
  food({ canonicalName: "fish", aliases: ["fish", "salmon", "tuna", "cod", "grilled fish"], fodmapLevel: "Low", fodmapGroups: [], baseRiskScore: 4, commonConcerns: [], positiveFactors: ["Often gentle when plainly cooked"], saferAlternatives: [], portionSensitive: false }),
  food({ canonicalName: "lentils", aliases: ["lentils", "lentil", "dal", "dhal", "red lentils"], fodmapLevel: "High", fodmapGroups: ["GOS"], baseRiskScore: 22, commonConcerns: ["Legumes may contain GOS"], positiveFactors: [], saferAlternatives: ["smaller portion", "well-soaked and rinsed lentils"], portionSensitive: true }),
  food({ canonicalName: "chickpeas", aliases: ["chickpeas", "chickpea", "garbanzo", "hummus", "chana"], fodmapLevel: "High", fodmapGroups: ["GOS"], baseRiskScore: 22, commonConcerns: ["Legumes may contain GOS"], positiveFactors: [], saferAlternatives: ["small hummus portion"], portionSensitive: true }),
  food({ canonicalName: "beans", aliases: ["beans", "kidney beans", "black beans", "baked beans", "butter beans"], fodmapLevel: "High", fodmapGroups: ["GOS"], baseRiskScore: 23, commonConcerns: ["Legumes may contain GOS and fermentable fibre"], positiveFactors: [], saferAlternatives: ["smaller portion"], portionSensitive: true }),
  food({ canonicalName: "potatoes", aliases: ["potato", "potatoes", "boiled potato", "mashed potato", "jacket potato"], fodmapLevel: "Low", fodmapGroups: [], baseRiskScore: 5, commonConcerns: [], positiveFactors: ["Often tolerated as a gentle starch"], saferAlternatives: [], portionSensitive: true }),
  food({ canonicalName: "sweet potatoes", aliases: ["sweet potato", "sweet potatoes", "yam"], fodmapLevel: "Moderate", fodmapGroups: ["Polyols"], baseRiskScore: 10, commonConcerns: ["Larger portions may feel heavier for some people"], positiveFactors: [], saferAlternatives: ["regular potato", "smaller portion"], portionSensitive: true }),
  food({ canonicalName: "carrots", aliases: ["carrot", "carrots"], fodmapLevel: "Low", fodmapGroups: [], baseRiskScore: 3, commonConcerns: [], positiveFactors: ["Often gentle cooked vegetable"], saferAlternatives: [], portionSensitive: true }),
  food({ canonicalName: "cucumber", aliases: ["cucumber", "cucumbers"], fodmapLevel: "Low", fodmapGroups: [], baseRiskScore: 3, commonConcerns: [], positiveFactors: ["Often gentle and hydrating"], saferAlternatives: [], portionSensitive: true }),
  food({ canonicalName: "tomato", aliases: ["tomato", "tomatoes", "cherry tomato"], fodmapLevel: "Low", fodmapGroups: [], baseRiskScore: 5, commonConcerns: ["Acidity may bother some people"], positiveFactors: [], saferAlternatives: [], portionSensitive: true }),
  food({ canonicalName: "spinach", aliases: ["spinach", "baby spinach"], fodmapLevel: "Low", fodmapGroups: [], baseRiskScore: 4, commonConcerns: [], positiveFactors: ["Leafy greens in modest portions"], saferAlternatives: [], portionSensitive: true }),
  food({ canonicalName: "broccoli", aliases: ["broccoli"], fodmapLevel: "Moderate", fodmapGroups: ["Fructans"], baseRiskScore: 12, commonConcerns: ["May contain fructans in larger portions"], positiveFactors: [], saferAlternatives: ["smaller portion", "carrots", "spinach"], portionSensitive: true }),
  food({ canonicalName: "cauliflower", aliases: ["cauliflower"], fodmapLevel: "Moderate", fodmapGroups: ["Polyols"], baseRiskScore: 14, commonConcerns: ["May cause gas for some people in larger portions"], positiveFactors: [], saferAlternatives: ["smaller portion"], portionSensitive: true }),
  food({ canonicalName: "cabbage", aliases: ["cabbage", "white cabbage", "red cabbage"], fodmapLevel: "Moderate", fodmapGroups: ["Fructans"], baseRiskScore: 13, commonConcerns: ["May feel gassy for some people"], positiveFactors: [], saferAlternatives: ["smaller portion"], portionSensitive: true }),
  food({ canonicalName: "mushrooms", aliases: ["mushroom", "mushrooms", "button mushrooms"], fodmapLevel: "Moderate", fodmapGroups: ["Polyols"], baseRiskScore: 14, commonConcerns: ["May contain polyols"], positiveFactors: [], saferAlternatives: ["small portion"], portionSensitive: true }),
  food({ canonicalName: "apples", aliases: ["apple", "apples", "green apple"], fodmapLevel: "High", fodmapGroups: ["Fructose", "Polyols"], baseRiskScore: 20, commonConcerns: ["May contain excess fructose and polyols"], positiveFactors: [], saferAlternatives: ["unripe banana", "orange"], portionSensitive: true }),
  food({ canonicalName: "bananas", aliases: ["banana", "bananas", "ripe banana", "unripe banana"], fodmapLevel: "Moderate", fodmapGroups: ["Fructans"], baseRiskScore: 10, commonConcerns: ["Ripeness may change fermentable load"], positiveFactors: ["Unripe banana may be gentler for some people"], saferAlternatives: ["unripe banana"], portionSensitive: true }),
  food({ canonicalName: "oranges", aliases: ["orange", "oranges"], fodmapLevel: "Low", fodmapGroups: [], baseRiskScore: 6, commonConcerns: ["Acidity may bother some people"], positiveFactors: [], saferAlternatives: [], portionSensitive: true }),
  food({ canonicalName: "grapes", aliases: ["grape", "grapes"], fodmapLevel: "Moderate", fodmapGroups: ["Fructose"], baseRiskScore: 11, commonConcerns: ["Larger portions may feel heavy"], positiveFactors: [], saferAlternatives: ["small portion"], portionSensitive: true }),
  food({ canonicalName: "mango", aliases: ["mango", "mangoes"], fodmapLevel: "Moderate", fodmapGroups: ["Fructose"], baseRiskScore: 12, commonConcerns: ["Sweet fruit portions may matter"], positiveFactors: [], saferAlternatives: ["small portion"], portionSensitive: true }),
  food({ canonicalName: "watermelon", aliases: ["watermelon"], fodmapLevel: "Moderate", fodmapGroups: ["Fructose", "Polyols"], baseRiskScore: 13, commonConcerns: ["Portion size may matter"], positiveFactors: [], saferAlternatives: ["small portion"], portionSensitive: true }),
  food({ canonicalName: "kiwi", aliases: ["kiwi", "kiwifruit"], fodmapLevel: "Low", fodmapGroups: [], baseRiskScore: 6, commonConcerns: ["Acidity may bother some people"], positiveFactors: [], saferAlternatives: [], portionSensitive: true }),
  food({ canonicalName: "coffee", aliases: ["coffee", "espresso", "latte", "cappuccino", "black coffee"], fodmapLevel: "Moderate", fodmapGroups: [], baseRiskScore: 14, commonConcerns: ["Caffeine may stimulate the gut for some people"], positiveFactors: [], saferAlternatives: ["decaf coffee", "smaller cup"], portionSensitive: true }),
  food({ canonicalName: "tea", aliases: ["tea", "black tea", "green tea", "chai", "milk tea"], fodmapLevel: "Low", fodmapGroups: [], baseRiskScore: 8, commonConcerns: ["Caffeine and milk additions may matter"], positiveFactors: [], saferAlternatives: ["herbal tea", "weak tea"], portionSensitive: true }),
  food({ canonicalName: "soft drinks", aliases: ["soft drink", "soft drinks", "soda", "cola", "fizzy drink"], fodmapLevel: "Moderate", fodmapGroups: [], baseRiskScore: 12, commonConcerns: ["Carbonation and sweeteners may bother some people"], positiveFactors: [], saferAlternatives: ["still water"], portionSensitive: true }),
  food({ canonicalName: "alcohol", aliases: ["alcohol", "beer", "wine", "spirits", "whisky", "vodka"], fodmapLevel: "Moderate", fodmapGroups: [], baseRiskScore: 16, commonConcerns: ["May irritate the gut or affect motility for some people"], positiveFactors: [], saferAlternatives: ["smaller portion", "avoid if sensitive"], portionSensitive: true }),
  food({ canonicalName: "artificial sweeteners", aliases: ["artificial sweetener", "artificial sweeteners", "sorbitol", "xylitol", "mannitol", "maltitol", "sugar-free"], fodmapLevel: "High", fodmapGroups: ["Polyols"], baseRiskScore: 22, commonConcerns: ["Polyols may cause bloating or loose stools in some people"], positiveFactors: [], saferAlternatives: ["small amount of sugar", "honey (small portion)"], portionSensitive: true }),
  food({ canonicalName: "honey", aliases: ["honey"], fodmapLevel: "Moderate", fodmapGroups: ["Fructose"], baseRiskScore: 12, commonConcerns: ["Fructose load may matter in larger amounts"], positiveFactors: [], saferAlternatives: ["small portion"], portionSensitive: true }),
  food({ canonicalName: "sugar", aliases: ["sugar", "white sugar", "brown sugar"], fodmapLevel: "Low", fodmapGroups: [], baseRiskScore: 6, commonConcerns: ["Large sweet loads may still affect some people"], positiveFactors: [], saferAlternatives: [], portionSensitive: true }),
  food({ canonicalName: "chilli", aliases: ["chilli", "chili", "chilli pepper", "hot pepper", "spicy"], fodmapLevel: "Moderate", fodmapGroups: [], baseRiskScore: 13, commonConcerns: ["Spicy foods may irritate the gut for some people"], positiveFactors: [], saferAlternatives: ["mild seasoning"], portionSensitive: true }),
  food({ canonicalName: "fried foods", aliases: ["fried", "fried food", "fried foods", "deep fried", "fries", "chips"], fodmapLevel: "Moderate", fodmapGroups: [], baseRiskScore: 15, commonConcerns: ["High fat may slow digestion or feel heavy"], positiveFactors: [], saferAlternatives: ["grilled", "steamed", "baked"], portionSensitive: true }),
  food({ canonicalName: "high-fat foods", aliases: ["high fat", "high-fat", "fatty food", "creamy sauce", "butter heavy"], fodmapLevel: "Moderate", fodmapGroups: [], baseRiskScore: 14, commonConcerns: ["High fat meals may feel heavy for some people with IBS"], positiveFactors: [], saferAlternatives: ["lighter cooking method"], portionSensitive: true }),
  food({ canonicalName: "peanuts", aliases: ["peanut", "peanuts", "peanut butter"], fodmapLevel: "Low", fodmapGroups: [], baseRiskScore: 7, commonConcerns: ["Large portions of nut butters may feel heavy"], positiveFactors: [], saferAlternatives: ["small portion"], portionSensitive: true }),
  food({ canonicalName: "almonds", aliases: ["almond", "almonds", "almond milk"], fodmapLevel: "Moderate", fodmapGroups: [], baseRiskScore: 10, commonConcerns: ["Portion size matters for nuts"], positiveFactors: [], saferAlternatives: ["small handful"], portionSensitive: true }),
  food({ canonicalName: "tofu", aliases: ["tofu", "firm tofu", "silken tofu"], fodmapLevel: "Low", fodmapGroups: [], baseRiskScore: 6, commonConcerns: [], positiveFactors: ["Plant protein option for many people"], saferAlternatives: [], portionSensitive: true }),
  food({ canonicalName: "corn", aliases: ["corn", "sweetcorn", "corn on the cob"], fodmapLevel: "Moderate", fodmapGroups: [], baseRiskScore: 10, commonConcerns: ["Fibre load may matter"], positiveFactors: [], saferAlternatives: ["small portion"], portionSensitive: true }),
  food({ canonicalName: "peas", aliases: ["peas", "green peas"], fodmapLevel: "Moderate", fodmapGroups: ["GOS"], baseRiskScore: 11, commonConcerns: ["May contain GOS in larger portions"], positiveFactors: [], saferAlternatives: ["small portion"], portionSensitive: true }),
  food({ canonicalName: "zucchini", aliases: ["zucchini", "courgette"], fodmapLevel: "Low", fodmapGroups: [], baseRiskScore: 4, commonConcerns: [], positiveFactors: ["Often gentle vegetable"], saferAlternatives: [], portionSensitive: true }),
  food({ canonicalName: "eggplant", aliases: ["eggplant", "aubergine", "brinjal"], fodmapLevel: "Low", fodmapGroups: [], baseRiskScore: 5, commonConcerns: [], positiveFactors: [], saferAlternatives: [], portionSensitive: true }),
  food({ canonicalName: "bell pepper", aliases: ["bell pepper", "capsicum", "red pepper", "green pepper"], fodmapLevel: "Low", fodmapGroups: [], baseRiskScore: 5, commonConcerns: [], positiveFactors: [], saferAlternatives: [], portionSensitive: true }),
  food({ canonicalName: "lettuce", aliases: ["lettuce", "salad leaves", "mixed salad"], fodmapLevel: "Low", fodmapGroups: [], baseRiskScore: 3, commonConcerns: [], positiveFactors: ["Light salad base"], saferAlternatives: [], portionSensitive: true }),
  food({ canonicalName: "avocado", aliases: ["avocado", "avocados"], fodmapLevel: "Moderate", fodmapGroups: ["Polyols"], baseRiskScore: 12, commonConcerns: ["Portion size matters"], positiveFactors: ["Healthy fats in small amounts"], saferAlternatives: ["small portion (2 tbsp)"], portionSensitive: true }),
  food({ canonicalName: "butter", aliases: ["butter", "ghee"], fodmapLevel: "Low", fodmapGroups: ["Lactose"], baseRiskScore: 7, commonConcerns: ["High fat may feel heavy"], positiveFactors: ["Low lactose compared with milk"], saferAlternatives: ["small amount"], portionSensitive: true }),
  food({ canonicalName: "cream", aliases: ["cream", "double cream", "whipping cream"], fodmapLevel: "High", fodmapGroups: ["Lactose"], baseRiskScore: 18, commonConcerns: ["Lactose and fat may bother some people"], positiveFactors: [], saferAlternatives: ["lactose-free cream", "small portion"], portionSensitive: true }),
  food({ canonicalName: "ice cream", aliases: ["ice cream", "icecream"], fodmapLevel: "High", fodmapGroups: ["Lactose"], baseRiskScore: 19, commonConcerns: ["Lactose and cold fat combination"], positiveFactors: [], saferAlternatives: ["lactose-free ice cream"], portionSensitive: true }),
  food({ canonicalName: "soy sauce", aliases: ["soy sauce", "soya sauce"], fodmapLevel: "Low", fodmapGroups: [], baseRiskScore: 5, commonConcerns: ["Small amounts usually used"], positiveFactors: [], saferAlternatives: [], portionSensitive: true }),
  food({ canonicalName: "ginger", aliases: ["ginger", "fresh ginger"], fodmapLevel: "Low", fodmapGroups: [], baseRiskScore: 4, commonConcerns: [], positiveFactors: ["May feel soothing for some people"], saferAlternatives: [], portionSensitive: true }),
  food({ canonicalName: "turmeric", aliases: ["turmeric", "haldi"], fodmapLevel: "Low", fodmapGroups: [], baseRiskScore: 3, commonConcerns: [], positiveFactors: [], saferAlternatives: [], portionSensitive: false }),
  food({ canonicalName: "coconut milk", aliases: ["coconut milk", "coconut cream"], fodmapLevel: "Moderate", fodmapGroups: [], baseRiskScore: 11, commonConcerns: ["High fat may feel heavy"], positiveFactors: [], saferAlternatives: ["light coconut milk"], portionSensitive: true }),
  food({ canonicalName: "curry", aliases: ["curry", "curry sauce", "masala", "korma", "biryani", "restaurant curry"], fodmapLevel: "Unknown", fodmapGroups: [], baseRiskScore: 18, commonConcerns: ["Sauce ingredients may be unclear", "Restaurant meals may contain onion and garlic"], positiveFactors: [], saferAlternatives: ["home-cooked with known ingredients"], portionSensitive: true }),
  food({ canonicalName: "processed meal", aliases: ["processed meal", "ready meal", "packaged meal", "frozen meal", "unknown sauce"], fodmapLevel: "Unknown", fodmapGroups: [], baseRiskScore: 16, commonConcerns: ["Ingredient list may be incomplete"], positiveFactors: [], saferAlternatives: ["meal with known ingredients"], portionSensitive: true }),
  food({ canonicalName: "buffet", aliases: ["buffet", "mixed buffet", "mixed plate"], fodmapLevel: "Unknown", fodmapGroups: [], baseRiskScore: 17, commonConcerns: ["Multiple unknown ingredients and sauces"], positiveFactors: [], saferAlternatives: ["simple plate with known items"], portionSensitive: true }),
  food({ canonicalName: "restaurant meal", aliases: ["restaurant meal", "restaurant food", "takeaway", "take away"], fodmapLevel: "Unknown", fodmapGroups: [], baseRiskScore: 15, commonConcerns: ["Hidden onion, garlic, or high-fat sauces are common"], positiveFactors: [], saferAlternatives: ["plain grilled protein and rice"], portionSensitive: true }),
  food({ canonicalName: "gluten-free bread", aliases: ["gluten free bread", "gluten-free bread"], fodmapLevel: "Moderate", fodmapGroups: [], baseRiskScore: 9, commonConcerns: ["May still contain other fermentable ingredients"], positiveFactors: ["May avoid wheat fructans"], saferAlternatives: [], portionSensitive: true }),
  food({ canonicalName: "quinoa", aliases: ["quinoa"], fodmapLevel: "Low", fodmapGroups: [], baseRiskScore: 6, commonConcerns: ["Portion size may matter"], positiveFactors: ["Alternative grain option"], saferAlternatives: [], portionSensitive: true }),
  food({ canonicalName: "pork", aliases: ["pork", "bacon", "ham"], fodmapLevel: "Low", fodmapGroups: [], baseRiskScore: 7, commonConcerns: ["Processed meats may feel heavy or salty"], positiveFactors: [], saferAlternatives: ["plain lean cut"], portionSensitive: true }),
  food({ canonicalName: "lamb", aliases: ["lamb", "mutton"], fodmapLevel: "Low", fodmapGroups: [], baseRiskScore: 7, commonConcerns: ["Fat content may matter"], positiveFactors: [], saferAlternatives: ["lean portion"], portionSensitive: true }),
  food({ canonicalName: "shrimp", aliases: ["shrimp", "prawns", "prawn"], fodmapLevel: "Low", fodmapGroups: [], baseRiskScore: 5, commonConcerns: [], positiveFactors: ["Lean protein option"], saferAlternatives: [], portionSensitive: false }),
  food({ canonicalName: "olive oil", aliases: ["olive oil"], fodmapLevel: "Low", fodmapGroups: [], baseRiskScore: 4, commonConcerns: ["Large oily meals may feel heavy"], positiveFactors: ["Simple cooking fat"], saferAlternatives: [], portionSensitive: true }),
  food({ canonicalName: "lemon", aliases: ["lemon", "lime", "lemon juice"], fodmapLevel: "Low", fodmapGroups: [], baseRiskScore: 4, commonConcerns: ["Acidity may bother some people"], positiveFactors: [], saferAlternatives: [], portionSensitive: true }),
  food({ canonicalName: "mint", aliases: ["mint", "peppermint tea"], fodmapLevel: "Low", fodmapGroups: [], baseRiskScore: 3, commonConcerns: [], positiveFactors: ["Herbal options may feel soothing"], saferAlternatives: [], portionSensitive: false }),
  food({ canonicalName: "chocolate", aliases: ["chocolate", "dark chocolate", "milk chocolate"], fodmapLevel: "Moderate", fodmapGroups: ["Lactose"], baseRiskScore: 11, commonConcerns: ["Caffeine, fat, and lactose may matter"], positiveFactors: [], saferAlternatives: ["small portion dark chocolate"], portionSensitive: true }),
  food({ canonicalName: "protein shake", aliases: ["protein shake", "whey protein"], fodmapLevel: "Moderate", fodmapGroups: ["Lactose"], baseRiskScore: 12, commonConcerns: ["Whey may contain lactose; sweeteners may matter"], positiveFactors: [], saferAlternatives: ["lactose-free protein"], portionSensitive: true }),
  food({ canonicalName: "soy milk", aliases: ["soy milk", "soya milk"], fodmapLevel: "Moderate", fodmapGroups: ["GOS"], baseRiskScore: 10, commonConcerns: ["Soy products may bother some people"], positiveFactors: [], saferAlternatives: ["lactose-free milk", "almond milk (small portion)"], portionSensitive: true }),
  food({ canonicalName: "cashews", aliases: ["cashew", "cashews"], fodmapLevel: "Moderate", fodmapGroups: ["Fructans"], baseRiskScore: 11, commonConcerns: ["Portion-sensitive nut"], positiveFactors: [], saferAlternatives: ["small portion"], portionSensitive: true }),
  food({ canonicalName: "pizza", aliases: ["pizza"], fodmapLevel: "High", fodmapGroups: ["Fructans", "Lactose"], baseRiskScore: 24, commonConcerns: ["Wheat base, cheese, and garlic/onion sauces are common"], positiveFactors: [], saferAlternatives: ["thin crust small portion", "gluten-free base"], portionSensitive: true }),
  food({ canonicalName: "burger", aliases: ["burger", "hamburger", "cheeseburger"], fodmapLevel: "Moderate", fodmapGroups: ["Fructans", "Lactose"], baseRiskScore: 16, commonConcerns: ["Bun, onion, and cheese may add triggers"], positiveFactors: [], saferAlternatives: ["bun-free", "no onion"], portionSensitive: true }),
  food({ canonicalName: "soup", aliases: ["soup", "broth", "stock"], fodmapLevel: "Moderate", fodmapGroups: ["Fructans"], baseRiskScore: 12, commonConcerns: ["Stock may contain onion or garlic"], positiveFactors: [], saferAlternatives: ["homemade low-FODMAP broth"], portionSensitive: true }),
  food({ canonicalName: "salad dressing", aliases: ["salad dressing", "dressing", "mayonnaise", "mayo"], fodmapLevel: "Moderate", fodmapGroups: [], baseRiskScore: 10, commonConcerns: ["Garlic/onion and fat content may matter"], positiveFactors: [], saferAlternatives: ["olive oil and lemon"], portionSensitive: true }),
  food({ canonicalName: "pickles", aliases: ["pickle", "pickles", "fermented vegetables"], fodmapLevel: "Moderate", fodmapGroups: [], baseRiskScore: 9, commonConcerns: ["Fermented foods may affect people differently"], positiveFactors: [], saferAlternatives: ["small portion"], portionSensitive: true }),
  food({ canonicalName: "dates", aliases: ["date", "dates"], fodmapLevel: "High", fodmapGroups: ["Fructose"], baseRiskScore: 18, commonConcerns: ["Dense fruit sugar load"], positiveFactors: [], saferAlternatives: ["small portion"], portionSensitive: true }),
  food({ canonicalName: "berries", aliases: ["berries", "strawberry", "strawberries", "blueberry", "blueberries", "raspberry"], fodmapLevel: "Low", fodmapGroups: [], baseRiskScore: 6, commonConcerns: ["Portion size may matter"], positiveFactors: ["May be tolerated in modest portions"], saferAlternatives: [], portionSensitive: true }),
  food({ canonicalName: "melon", aliases: ["melon", "cantaloupe", "honeydew"], fodmapLevel: "Moderate", fodmapGroups: ["Fructose"], baseRiskScore: 11, commonConcerns: ["Portion-sensitive fruit"], positiveFactors: [], saferAlternatives: ["small portion"], portionSensitive: true }),
  food({ canonicalName: "plain crackers", aliases: ["cracker", "crackers", "plain crackers", "rice crackers"], fodmapLevel: "Moderate", fodmapGroups: ["Fructans"], baseRiskScore: 9, commonConcerns: ["Wheat crackers may contain fructans"], positiveFactors: [], saferAlternatives: ["rice crackers"], portionSensitive: true }),
  food({ canonicalName: "granola", aliases: ["granola", "muesli"], fodmapLevel: "Moderate", fodmapGroups: ["Fructans"], baseRiskScore: 13, commonConcerns: ["May contain wheat, honey, or dried fruit"], positiveFactors: [], saferAlternatives: ["plain oats"], portionSensitive: true }),
  food({ canonicalName: "smoothie", aliases: ["smoothie", "fruit smoothie"], fodmapLevel: "Moderate", fodmapGroups: ["Fructose"], baseRiskScore: 14, commonConcerns: ["Multiple fruits may increase fermentable load"], positiveFactors: [], saferAlternatives: ["single low-FODMAP fruit"], portionSensitive: true }),
  food({ canonicalName: "coconut water", aliases: ["coconut water"], fodmapLevel: "Low", fodmapGroups: [], baseRiskScore: 5, commonConcerns: [], positiveFactors: ["Hydration option for some people"], saferAlternatives: [], portionSensitive: true }),
  food({ canonicalName: "herbal tea", aliases: ["herbal tea", "peppermint tea", "chamomile tea"], fodmapLevel: "Low", fodmapGroups: [], baseRiskScore: 3, commonConcerns: [], positiveFactors: ["Caffeine-free option"], saferAlternatives: [], portionSensitive: false }),
  food({ canonicalName: "plain water", aliases: ["water", "plain water"], fodmapLevel: "Low", fodmapGroups: [], baseRiskScore: 0, commonConcerns: [], positiveFactors: ["Hydration supports gut routine"], saferAlternatives: [], portionSensitive: false }),
];

const aliasIndex = new Map<string, IbsFoodRecord>();

for (const record of IBS_FOOD_KNOWLEDGE) {
  aliasIndex.set(normalizeIngredientName(record.canonicalName), record);
  for (const alias of record.aliases) {
    aliasIndex.set(normalizeIngredientName(alias), record);
  }
}

export function normalizeIngredientName(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function splitIngredientText(text: string): string[] {
  return text
    .split(/[\n,;|+/&()]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
}

export function lookupFoodKnowledge(query: string): IbsFoodRecord | null {
  const normalized = normalizeIngredientName(query);
  if (!normalized) return null;

  const direct = aliasIndex.get(normalized);
  if (direct) return direct;

  let best: IbsFoodRecord | null = null;
  let bestLength = 0;

  for (const [alias, record] of aliasIndex.entries()) {
    if (normalized.includes(alias) || alias.includes(normalized)) {
      if (alias.length > bestLength) {
        best = record;
        bestLength = alias.length;
      }
    }
  }

  return best;
}

export function matchFoodsInText(text: string): {
  matched: Array<{ token: string; record: IbsFoodRecord }>;
  unknown: string[];
} {
  const tokens = splitIngredientText(text);
  const matched: Array<{ token: string; record: IbsFoodRecord }> = [];
  const unknown: string[] = [];
  const seen = new Set<string>();

  for (const token of tokens) {
    // Long free-text phrases are handled by embedded alias scanning below.
    if (token.includes(" ") && token.length > 24) {
      continue;
    }

    const record = lookupFoodKnowledge(token);
    if (record) {
      const key = record.canonicalName;
      if (!seen.has(key)) {
        seen.add(key);
        matched.push({ token, record });
      }
    } else if (token.length >= 3) {
      unknown.push(token);
    }
  }

  // Also scan full text for embedded aliases (e.g. "coffee with milk")
  const normalizedText = normalizeIngredientName(text);
  const embeddedAliases: Array<{ alias: string; record: IbsFoodRecord }> = [];

  for (const record of IBS_FOOD_KNOWLEDGE) {
    for (const alias of [record.canonicalName, ...record.aliases]) {
      const normalized = normalizeIngredientName(alias);
      if (normalized.length >= 3) {
        embeddedAliases.push({ alias: normalized, record });
      }
    }
  }

  embeddedAliases.sort((a, b) => b.alias.length - a.alias.length);

  const matchedRanges: Array<{ start: number; end: number }> = [];

  for (const { alias, record } of embeddedAliases) {
    if (seen.has(record.canonicalName)) continue;

    const idx = normalizedText.indexOf(alias);
    if (idx === -1) continue;

    const start = idx;
    const end = idx + alias.length;
    const overlaps = matchedRanges.some((range) => !(end <= range.start || start >= range.end));
    if (overlaps) continue;

    seen.add(record.canonicalName);
    matchedRanges.push({ start, end });
    matched.push({ token: alias, record });
  }

  return { matched, unknown };
}
