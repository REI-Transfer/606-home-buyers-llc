#!/usr/bin/env python3
"""Batch-generate a NEUTRAL/nationwide advertorial image set via Kie.ai (nano-banana-2), 3:2.
For the shared rei-survey-template (Express / Pathway / Pure Growth). Generic American
homes, mixed US demographics, homeowners 55+, older/dated/worn properties. Pink Elephant
rule: NO text, signs, logos, readable documents, or readable screens anywhere.
Run from repo root: python3 .imggen/batch_gen.py  (skips files that already exist)
"""
import os, sys, json, time, requests

API_KEY = os.environ.get("KIE_API_KEY")
if not API_KEY:
    sys.exit("ERROR: KIE_API_KEY not set")
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "images")
os.makedirs(OUT, exist_ok=True)

STYLE = ("Photorealistic editorial documentary photograph, natural available light, candid and "
         "authentic, full-frame DSLR 35mm lens, shallow depth of field, warm realistic color "
         "grade. Generic suburban United States setting, modest older middle-class homes. Mixed "
         "American demographics. Absolutely NO text, signs, logos, lettering, readable documents, "
         "or readable phone/laptop screens anywhere in the image.")

PROMPTS = {
 "adv-home-exterior": "A modest, dated single-story suburban American home, aging roof, faded siding, slightly overgrown yard, clearly lived-in and in need of some work, soft afternoon light. No people.",
 "adv-strangers-open-house": "Several unfamiliar people in casual clothes touring the living room of an older home during an open house, an older homeowner couple in their 60s standing back looking uneasy, dated furniture and worn carpet.",
 "adv-empty-rooms": "Quiet, mostly empty upstairs hallway and wooden staircase of a longtime older family home, a few cardboard boxes, warm dusty light through a window, nostalgic and still, no people.",
 "adv-couple-window": "An older married couple in their late 60s standing together looking out the window of their older living room, thoughtful expressions, dated curtains and furniture, soft natural light.",
 "adv-handshake": "A warm, simple handshake between a friendly home buyer (person in their 30s, plain casual shirt) and an older homeowner in their 60s, on the porch of a modest older home, genuine smiles.",
 "adv-local-team": "Friendly approachable headshot-style portrait of a home-buying small business owner in their late 30s in a plain dark shirt, standing in front of a modest American home, confident and trustworthy, no logos.",
 "adv-keys-couple": "A relieved, happy older couple in their late 60s standing outside their modest home, one of them holding a single house key, genuine warm smiles, soft golden light.",
 "adv-couple-kitchen": "An older couple in their 60s sitting at the table of a dated 1980s kitchen with oak cabinets and worn linoleum, talking quietly together, morning light.",
 "adv-homeowner-repair": "An older homeowner in their late 60s standing in a hallway looking up with concern at a water-stained ceiling and peeling paint, worn older home interior.",
 "adv-dated-kitchen": "An outdated 1980s kitchen in an older home, oak cabinets, worn laminate counters, old appliances, faded wallpaper, lived-in and tired, no people.",
 "adv-paperwork-alone": "An older person in their early 70s sitting alone at a kitchen table with a small stack of blank papers and a pen, looking worried and overwhelmed, soft window light. Papers are blank with no readable text.",
 "adv-phone-vetting": "A cautious older person in their late 60s sitting in their living room holding a phone to their ear with a careful, skeptical expression, dated interior.",
 "adv-numbers-table": "Close-up of an older person's hands and a younger person's hands at a wooden kitchen table with a calculator and blank notepad, discussing, no readable numbers or text on anything.",
 "adv-renovation": "Interior of an older home mid-renovation, exposed drywall, ladder, drop cloths, tools on the floor, unfinished and dusty, no people, no text.",
 "adv-buyer-explaining": "A friendly home buyer in their 30s in plain casual clothes sitting at a kitchen table calmly explaining something to an attentive older couple in their 60s, warm and trustworthy, dated home interior.",
 "adv-senior-cautious": "A thoughtful, slightly cautious older man in his early 70s sitting in his worn armchair in a dated living room, hand on chin, considering a decision, soft light.",
 "adv-frustrated-laptop": "An older person in their 60s sitting at a dining table looking frustrated and tired in front of a closed or angled-away laptop, rubbing their forehead, dated home, no readable screen.",
 "adv-buyer-at-door": "A friendly home buyer in their 30s in a plain shirt standing on the front porch of a modest older American home greeting an older homeowner at the open door, warm and respectful, daytime.",
 "adv-testimonial-1": "Warm natural portrait of a woman about 71, silver hair, gentle genuine smile, sitting in her modest older living room, soft window light, head and shoulders.",
 "adv-testimonial-2": "Warm natural portrait of an older married couple, a man about 68 and a woman about 66, sitting close together on their porch smiling, head and shoulders.",
 "adv-testimonial-3": "Warm natural portrait of a man about 59, short greying hair, friendly confident smile, in a modest home interior, head and shoulders.",
 "adv-testimonial-4": "Warm natural portrait of a woman about 74, kind dignified expression, soft smile, in her older living room, soft light, head and shoulders.",
}

def gen(name, subject):
    out_path = os.path.join(OUT, name + ".jpg")
    if os.path.exists(out_path) and os.path.getsize(out_path) > 5000:
        print(f"SKIP {name}"); return True
    payload = {"model": "nano-banana-2", "input": {
        "prompt": subject + " " + STYLE, "aspect_ratio": "3:2", "resolution": "1K", "output_format": "jpg"}}
    h = {"Content-Type": "application/json", "Authorization": f"Bearer {API_KEY}"}
    try:
        r = requests.post("https://api.kie.ai/api/v1/jobs/createTask", headers=h, json=payload, timeout=30)
        tid = r.json().get("data", {}).get("taskId")
    except Exception as e:
        print(f"FAIL {name}: {e}"); return False
    if not tid:
        print(f"FAIL {name}: no taskId"); return False
    for _ in range(75):
        time.sleep(4)
        try:
            d = requests.get("https://api.kie.ai/api/v1/jobs/recordInfo", headers=h, params={"taskId": tid}, timeout=15).json().get("data", {})
        except Exception:
            continue
        st = d.get("state")
        if st in ("success", "completed"):
            urls = json.loads(d.get("resultJson", "{}")).get("resultUrls", [])
            if not urls:
                print(f"FAIL {name}: no url"); return False
            img = requests.get(urls[0], timeout=60)
            open(out_path, "wb").write(img.content)
            print(f"OK   {name} ({len(img.content)//1024}kb)"); return True
        if st in ("failed", "error"):
            print(f"FAIL {name}: server"); return False
    print(f"FAIL {name}: timeout"); return False

if __name__ == "__main__":
    ok = sum(1 for n, s in PROMPTS.items() if gen(n, s))
    print(f"\nDONE {ok}/{len(PROMPTS)} images")
