import { ArticleShell, H2, P, UL, ArticleImage } from "@/components/article/article-shell"
import { ContactCTA } from "@/components/article/contact-cta"
import config from "@/lib/config"

export const metadata = {
  title: "How to Tell a Serious Cash Home Buyer From a Tire-Kicker in About Five Minutes | Cash Home Offer",
  description:
    "A simple five-minute checklist for sizing up any cash home buyer before you share details or put your name on a single thing.",
}

export default function Page() {
  const area = config.marketName || "the areas we serve"
  return (
    <ArticleShell
      title="How to Tell a Serious Cash Home Buyer From a Tire-Kicker in About Five Minutes"
      dek="A simple checklist for sizing up any cash buyer and protecting yourself before you share a thing or sign anything."
      companyName={config.companyName}
    >
      <P>
        Maybe it was a phone call. Maybe it was a postcard in the mailbox. Either way, somebody wants
        to buy your house for cash. As-is. No repairs, no showings, no agents. And part of you thinks,
        wonderful, that is exactly what I have been hoping for. Then the other part of you, the part
        that has been around long enough to know better, pipes up. Hold on. Who is this person? Are
        they the real thing, or are they going to tie up my house for a month and then evaporate?
      </P>
      <P>
        If that is where your head is, good. That instinct is not paranoia. It is wisdom. Enough years
        on this earth have taught you that the people pushing hardest to hurry are usually the ones
        worth slowing down on. So let us put that instinct to work the right way.
      </P>
      <P>
        Here is what nobody bothers to tell you. You do not need to be a real estate pro to spot a
        flake. You do not need an attorney on standby just to ask a few honest questions. You need
        five questions and about five minutes. Ask them out loud, on the phone or at your kitchen
        table, and watch what the buyer does. The serious ones answer plainly. The tire-kickers get
        fidgety. That gap is the whole game.
      </P>

      <ArticleImage
        src="/images/adv-local-team.jpg"
        alt="A real home-buying team"
        caption="A serious buyer has a name, a face, and a team you can actually reach. Tire-kickers prefer to stay faceless."
      />

      <H2>1. Do You Actually Buy in My Area, and Can I Look You Up?</H2>
      <P>
        Begin here, because this one thins the herd all by itself. A real buyer who works across
        {area} has bought houses near you, and they can talk about it. Ask which neighborhoods
        they have closed in lately. Ask how long they have been doing this around your way.
      </P>
      <P>
        Good sign: they name actual streets and towns, they bring up recent purchases, and they are
        happy for you to search them online and read what other sellers had to say. A track record is
        something they are glad to put in your hands.
      </P>
      <P>
        Trouble sign: vague lines like we buy everywhere, or they cannot point you to a single review,
        a single past seller, or anything you can verify yourself. If their whole history lives only
        in their own mouth, that is not a history. That is a sales pitch.
      </P>

      <H2>2. Can You Prove You Actually Have the Money?</H2>
      <P>
        This is the polite question that quietly scares off the people who ought to be scared off. A
        genuine cash buyer has the funds lined up and can show you. Ask it straight: can you prove the
        money is there before we go any further?
      </P>
      <P>
        Good sign: they say yes without blinking and offer to show you proof of funds. They do not
        take offense. They expect the question, because every careful seller asks it.
      </P>
      <P>
        Trouble sign: they dodge, they say just trust me, or they admit they need to round up a partner
        or an investor first. That last one is the big tell. A so-called buyer who has to go shop your
        house to somebody else is not really the buyer. They are a middleman hoping to lock you up
        while they scramble. If the money is not theirs and ready, the deal is not real.
      </P>

      <ArticleImage
        src="/images/adv-buyer-at-door.jpg"
        alt="A buyer greeting a homeowner at the front door"
        caption="A funded buyer shows up, looks you in the eye, and answers your questions on the porch. No hiding behind a web form."
      />

      <H2>3. Will You Explain How You Got to Your Number?</H2>
      <P>
        Anybody can rattle off a price. The real question is whether they can stand behind it. A
        serious buyer will walk you through how they arrived at their offer. What homes near you have
        sold for, what shape yours is in, what they expect to put into it. It does not need to be
        fancy. It just needs to make sense.
      </P>
      <P>
        Good sign: they break it down in plain words and stay patient when you ask follow-up
        questions. You hang up understanding the number, even if you still want to think it over.
      </P>
      <P>
        Trouble sign: the offer is a riddle, or worse, it is suspiciously high. Here is the trap to
        keep an eye out for. Some operators wave a big number to get your signature, then carve
        thousands off once you are committed and worn down. They call it a price change after the
        inspection. A buyer who explains the math up front has far less room to pull that stunt on you
        later. So make them show their work.
      </P>

      <H2>4. Are You a Real Person, With a Real Address?</H2>
      <P>
        You are about to talk about your home, your timeline, maybe your finances. You have every
        right to know who is on the other end. So ask the basic stuff. Where is your office? Will a
        real person pick up when I call back? What is your name, and who is on your team?
      </P>
      <P>
        Good sign: a real presence, a phone number a human actually answers, and a person who gives
        you their name and stays with you through the whole conversation. You feel like you are
        dealing with a neighbor, not a call center three time zones away.
      </P>
      <P>
        Trouble sign: no address, only a web form, a number that always rolls to voicemail, or a
        revolving cast of people who do not know your situation. If you cannot easily reach them today,
        picture how tough they will be to track down on closing day when something needs fixing.
      </P>

      <H2>5. Will You Give Me Time, Put It in Writing, and Skip the Pressure?</H2>
      <P>
        This is the last filter, and maybe the most important one. A trustworthy buyer wants you to
        feel good about this. They will hand you the offer in writing so you can read it slowly, share
        it with your kids or your attorney, and sit with it. They will not rush you.
      </P>
      <P>
        Good sign: the offer comes in writing, the terms are clear, and no clock is ticking down on
        you. They tell you to take your time, and they mean it.
      </P>
      <P>
        Trouble sign: this offer is only good today. Sign now or it is gone. You do not need a lawyer,
        just trust me. Every one of those lines is built to get you moving before you can think it
        through. Real buyers know a good offer holds up in the light of day. Only the shaky ones need
        you in a hurry.
      </P>

      <ArticleImage
        src="/images/adv-couple-kitchen.jpg"
        alt="An older couple weighing a buyer at the kitchen table"
        caption="The right buyer hands you the offer in writing and tells you to take your time. The decision should feel calm, not rushed."
      />

      <H2>The Thing That Makes All Five Work</H2>
      <P>
        Notice what these five questions have in common. Not one of them asks you to know anything
        about real estate. They are not tests you can flunk. They are just honest questions any decent
        person would answer without a fuss.
      </P>
      <P>
        And here is the part that should lift a load off your shoulders. A real buyer welcomes every
        single one of these questions. They are glad you asked about their track record, their funds,
        their math, their address, and their timeline, because answering well is how they earn your
        trust and your business. Vetting them is not rude. It is the very thing that separates the real
        buyers from the tire-kickers, all on its own.
      </P>
      <P>
        Think about it. A flake hates these questions, so the questions chase them off. A serious buyer
        loves these questions, so the questions pull them closer. You do not have to figure out who is
        legit. You just have to ask, then watch how they react. Those five minutes do the sorting for
        you. Quick recap of what you are listening for:
      </P>
      <UL>
        <li>A track record you can look up, not just words.</li>
        <li>Proof of funds, offered without a fuss.</li>
        <li>A number they can explain in plain words.</li>
        <li>A real name, a real address, a human who answers.</li>
        <li>A written offer and no pressure to sign today.</li>
      </UL>
      <P>
        So the next time someone offers to buy your house for cash, do not feel like you have to be an
        expert or hire a team to protect yourself. Pour a cup of coffee, run them through these five
        questions, and trust what you see. If they pass with a smile, you may have found a buyer worth
        talking to. If they squirm, you just spared yourself a world of headache.
      </P>
      <P>
        You have spent decades reading people. This is just one more conversation where that skill
        earns its keep. Slow down, ask, and let the answers tell you the truth.
      </P>

      <ContactCTA
        phoneDisplay={config.phoneDisplay}
        phoneHref={config.phoneHref}
        smsKeyword={config.smsKeyword}
        heading="Put us through the checklist"
        subheading="Text us the word OFFER or call. Ask us anything before you share a single private detail."
      />
    </ArticleShell>
  )
}
