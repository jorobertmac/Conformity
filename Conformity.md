# Conformity — Game Instructions

## Overview

In **Conformity**, the player controls a **Dode** — a circle that starts as one of the 8 Identity colors. The player clicks on the screen to move their Dode to that location. Along the path, the Dode will **Bump** into other Dodes that are moving to random locations. During Bumps, color properties transfer according to each Dode’s characteristics.

**Goal:** Make your Identity reach the target percentage of all Dodes (set by difficulty).

---

## Possible Dode Colors

| Color   | RGB Values     |
|---------|----------------|
| Red     | (255, 0, 0)    |
| Lime    | (0, 255, 0)    |
| Blue    | (0, 0, 255)    |
| Yellow  | (255, 255, 0)  |
| Magenta | (255, 0, 255)  |
| Cyan    | (0, 255, 255)  |
| White   | (255, 255, 255)|
| Black   | (0, 0, 0)      |

---

## Dode Attributes & Characteristics

### Identity
Shown color, derived from the Ideology RGB values:

- For each R, G, and B channel:  
  - **0–127** → treated as **0**  
  - **128–255** → treated as **255**

The resulting (0 or 255) triplet maps to one of the eight possible Identity colors.

### Ideology
The true color — the actual R, G, and B values of the Dode.

### Conviction
How “pure” the Ideology is relative to the Identity.

**Calculation:**  
Sum of the absolute differences between each Ideology channel and its corresponding Identity channel.

**Example:**  
- Ideology: (219, 83, 136)  
- Identity: Magenta (255, 0, 255)  
- Conviction = |255 − 219| + |0 − 83| + |255 − 136| = 36 + 83 + 119 = **238**

- Lower Conviction = more pure Ideology = more convicted of that Identity.  
- Conviction closer to **0** means the Dode is highly committed to its Identity.

### Influence
A number between **1–100**.  
Determines how strongly a Dode can affect others during interactions.

### Urgency
The speed at which a Dode moves along its path.

A number between **1–5**.  
- Computer Dodes start at **2**.  
- The player Dode starts at **3**.  

*(Change of speed / dynamic adjustment is not yet implemented.)*

### Radius
The visual and collision size of a Dode.

All Dodes start with a radius of **5**.  
*(Radius may later change based on various factors; not yet implemented.)*

---

## Win Condition & Difficulty

The game is won when **any single Identity** reaches a target share of all living Dodes. That threshold is set by difficulty:

| Difficulty | Target share |
|------------|--------------|
| Easy       | **33%**      |
| Medium     | **50%**      |
| Hard       | **67%**      |
| Extreme    | **100%**     |

- If the player’s Identity is the one that hits the threshold → **You Conform** (win).
- If another Identity hits it first → **You Resist** (loss).

Percentages are evaluated continuously against the current total number of Dodes (including any offspring). There is no time limit.

---

## Game Start Setup

1. The game begins with **16 Dodes** on a neutral background (chosen so all possible colors remain visible).
2. Ideology values are distributed randomly to all Dodes.
3. Dodes are then re-evaluated to ensure an **even distribution of Identity colors** (exactly **2 of each** of the 8 Identities).
4. Each Dode’s Influence is randomly assigned between **45–55**.
5. Computer Dodes start with Urgency **2**; the player Dode starts with Urgency **3**.
6. All Dodes start with radius **5**.

The player starts as one of the 8 Identity colors and moves by clicking destinations on the screen. Choose a difficulty before beginning.

---

## Movement & Avoidance

Dodes do **not** pass through each other. Bodies have a solid radius; overlaps are pushed apart.

- **Bumps between active Dodes:** Two Dodes that are neither paused nor invulnerable may close distance and **Bump** on contact. Avoidance does not steer them away from each other beforehand.
- **Avoidance:** Moving Dodes steer around **paused** or **invulnerable** Dodes (and future static solids), then continue toward their target.
- **Hard separation:** Overlaps are resolved so bodies never occupy the same space.
- **Paused / invulnerable Dodes** still occupy space: others steer around their solid radius; they cannot receive a new Bump while invulnerable.
- The same obstacle list is meant to support future **Walls, Boxes, Rooms, Boundaries**, and other solids.

---

## Bump Mechanics

When two Dodes’ solid radii make contact (a **Bump**), the following occurs:

### 1. Pause & Cooldown
- Immediately after a Bump, both Dodes are affected by two independent timers:
  - **Pause** (movement stopped): random duration between **0.25–0.75 seconds**.
  - **Cooldown** (invulnerability — cannot be Bumped again): random duration between **2–4 seconds**.
- The two timers run independently; a Dode may resume moving while still invulnerable.
- While paused or invulnerable, the Dode remains a solid obstacle for others.

### 2. Dodette Formation & Offspring
Each Dode has its own **Dodette forming number** (starts at **2**).

- Two Dodes become **Dodettes** with each other when their mutual Bump count reaches **both** of their current Dodette forming numbers.
- After forming a Dodette, each Dode’s forming number increases by **1** (2 → 3 → 4 …).
- A Dode may form Dodettes with multiple partners over time; each new partnership uses that Dode’s current forming number.
- When two Dodes who are already Dodettes with each other Bump:
  - A **new Dode** is spawned at the Bump location.
  - **New Ideology** = average of the two parent Ideologies (each channel summed and divided by 2, rounded up).
    - Example:  
      (122, 95, 230) + (84, 200, 18)  
      → ((122+84)/2, (95+200)/2, (230+18)/2)  
      → (103, 148, 124)
  - **New Influence** = average of the two parent Influences (summed and divided by 2, rounded up).
  - The new Dode immediately begins moving (its own forming number starts at 2).
- Each Dodette pair is shown with a **line** between them. If a Dode has several Dodette partners, one line is drawn to each. Line color is the Identity of the partner with **more conviction** (lower Conviction value).

### 3. Same Identity — Strengthening
If both Dodes share the same Identity color, both **strengthen** their Identity by adjusting channels toward the pure form of that color:

| Identity | Channel Adjustment |
|----------|--------------------|
| Red      | (+, −, −)          |
| Lime     | (−, +, −)          |
| Blue     | (−, −, +)          |
| Yellow   | (+, +, −)          |
| Magenta  | (+, −, +)          |
| Cyan     | (−, +, +)          |
| White    | (+, +, +)          |
| Black    | (−, −, −)          |

### 4. Different Identity — Coercion
If the Dodes have different Identity colors:

- The Dode with the **lower Conviction** value (more convicted) **coerces** the other Dode toward its own Identity color.
- The coerced Dode’s Ideology channels are adjusted according to the same direction rules shown in the table above (matching the coercing Dode’s Identity).

---

## Summary of Key Interactions

| Situation                        | Result                                      |
|----------------------------------|---------------------------------------------|
| Same Identity Bump               | Both strengthen toward pure Identity        |
| Different Identity Bump          | Lower-Conviction Dode coerces the other     |
| Mutual bumps ≥ both forming #s   | Pair becomes Dodettes; each forming # +1    |
| Existing Dodette pair Bumps      | New offspring Dode is spawned               |
| Dodette pair (visual)            | Line between partners (color = more conviction) |
| After any Bump                   | 0.25–0.75 s pause + 2–4 s invulnerability   |
| Active + active contact          | Bump (avoidance does not block approach)    |
| Paused / invulnerable Dode       | Solid obstacle others steer around          |
| Overlap                          | Hard separation; no pass-through            |
| Identity reaches target %        | Game ends (Conform or Resist)               |

---

## Controls

- **Tap** (mobile) or **click** (desktop) anywhere on the screen to set the player Dode’s destination.
- Choose difficulty (33% / 50% / 67% / 100%) on the start screen.
- Game ends when an Identity hits the target share (no time limit).
- Layout and input are optimized for mobile and desktop (touch + mouse, safe areas, crisp canvas).

---

*Play to Conform. Or resist.*
