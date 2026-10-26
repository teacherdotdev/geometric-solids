import { expect, test, type Locator, type Page } from "@playwright/test";

const SOLIDS = [
  { kind: "rectangularPrism", surfaceArea: "94", volume: "60" },
  { kind: "cube", surfaceArea: "24", volume: "8" },
  { kind: "triangularPrism", surfaceArea: "72", volume: "30" },
  { kind: "squarePyramid", surfaceArea: "96", volume: "48" },
  { kind: "cylinder", surfaceArea: "20π", volume: "12π" },
  { kind: "cone", surfaceArea: "24π", volume: "12π" },
  { kind: "sphere", surfaceArea: "36π", volume: "36π" },
] as const;

async function totals(page: Page) {
  return {
    surfaceArea: await page.getByTestId("surface-total").innerText(),
    volume: await page.getByTestId("volume-total").innerText(),
  };
}

/** A face of the solid, as drawn: any one of the polygons that make it up. */
function face(page: Page, surfaceId: string): Locator {
  return page
    .getByTestId("solid-view")
    .locator(`polygon[data-target="surface:${surfaceId}"]`)
    .first();
}

/**
 * Point at a face, off to one side of its middle. A face's badge sits at its
 * centre, so pointing at the centre would be pointing at the badge instead.
 */
async function pointAtFace(page: Page, surfaceId: string, click = false) {
  const target = face(page, surfaceId);
  const box = await target.boundingBox();
  const position = {
    x: (box?.width ?? 20) * 0.25,
    y: (box?.height ?? 20) * 0.5,
  };
  await (click ? target.click({ position }) : target.hover({ position }));
}

/** An edge of the solid that carries the given length. */
function edge(page: Page, measure: string): Locator {
  return page
    .getByTestId("solid-view")
    .locator(`line[data-target="measure:${measure}"]`)
    .first();
}

/**
 * Point at an edge. A vertical edge is a zero-width line, so its own middle has
 * to be worked out and the mouse driven there directly.
 */
async function pointAtEdge(page: Page, measure: string, click = false) {
  const at = await edge(page, measure).evaluate((element) => {
    const box = element.getBoundingClientRect();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  });
  await page.mouse.move(at.x, at.y);
  if (click) await page.mouse.click(at.x, at.y);
}

/** Move the pointer well away from the shape. */
async function pointAway(page: Page) {
  await page.getByTestId("shape-rectangularPrism").hover();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  // Clicks and keystrokes are dropped until the page is live, which takes a
  // moment against a dev server building modules on demand.
  await expect(page.locator("[data-ready=true]")).toBeAttached();
});

test("switches the whole app between English, Spanish and French", async ({
  page,
}) => {
  const picker = page.getByTestId("language-select");

  await picker.selectOption("es");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.getByTestId("view-solid")).toHaveText("Sólido");
  await expect(page.getByTestId("view-net")).toHaveText("Red");
  await expect(page.getByTestId("shape-rectangularPrism")).toHaveAttribute(
    "aria-label",
    "Prisma rectangular",
  );
  await pointAtFace(page, "rectangularPrism:front");
  await expect(page.getByTestId("surface-front")).toContainText("Cara frontal");

  // The choice is stored for the whole site, including the prose pages.
  await page.goto("/about");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Acerca de");

  await page.getByTestId("language-select").selectOption("fr");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("À propos");

  await page.goto("/");
  await expect(page.getByTestId("view-solid")).toHaveText("Solide");
  await expect(page.getByTestId("view-net")).toHaveText("Patron");
  await expect(page.getByTestId("shape-rectangularPrism")).toHaveAttribute(
    "aria-label",
    "Pavé droit",
  );
});

test("shows the exact surface area and volume of every solid", async ({
  page,
}) => {
  for (const solid of SOLIDS) {
    await page.getByTestId(`shape-${solid.kind}`).click();
    await expect(page.getByTestId("surface-total")).toContainText(
      solid.surfaceArea,
    );
    await expect(page.getByTestId("volume-total")).toContainText(solid.volume);
  }
});

test("reports derived measurements as calculated, not editable", async ({
  page,
}) => {
  await page.getByTestId("shape-cone").click();
  await expect(page.getByTestId("derived-s")).toContainText("s = √(3² + 4²)");
  await expect(page.getByTestId("derived-s")).toContainText("5");
  await expect(page.getByTestId("input-s")).toHaveCount(0);

  await page.getByTestId("shape-triangularPrism").click();
  await expect(page.getByTestId("derived-c")).toContainText("c = √(3² + 4²)");
  await expect(page.getByTestId("input-c")).toHaveCount(0);

  await page.getByTestId("shape-squarePyramid").click();
  await expect(page.getByTestId("derived-s")).toContainText(
    "s = √(4² + (6/2)²)",
  );
  await expect(page.getByTestId("derived-s")).toContainText("5");
  await expect(page.getByTestId("input-s")).toHaveCount(0);
});

test("recalculates when a dimension changes", async ({ page }) => {
  await page.getByTestId("input-l").fill("6");
  await expect(page.getByTestId("volume-total")).toContainText("120");
  await expect(page.getByTestId("surface-total")).toContainText("148");

  await page.getByTestId("increase-w").click();
  await expect(page.getByTestId("input-w")).toHaveValue("4.1");
  await expect(page.getByTestId("volume-total")).toContainText("123");
});

test("rejects invalid dimensions and keeps the last valid geometry", async ({
  page,
}) => {
  const before = await totals(page);

  for (const invalid of ["", "0", "-2", "100000.1", "abc", "2.25"]) {
    await page.getByTestId("input-l").fill(invalid);
    await expect(page.getByTestId("error-l")).toBeVisible();
    await expect(page.getByTestId("solid-view")).toBeVisible();
    expect(await totals(page)).toEqual(before);
    await expect(page.getByTestId("surface-total")).not.toContainText("NaN");
  }

  await page.getByTestId("input-l").fill("3");
  await expect(page.getByTestId("error-l")).toHaveCount(0);
  expect(await totals(page)).toEqual(before);
});

test("switches between the solid and its net, and explains the sphere", async ({
  page,
}) => {
  await page.getByTestId("shape-cylinder").click();
  await expect(page.getByTestId("solid-view")).toBeVisible();

  await page.getByTestId("view-net").click();
  await expect(page.getByTestId("net-view")).toBeVisible();
  await expect(page.getByTestId("solid-view")).toHaveCount(0);
  // Dimensions and results survive the view change.
  await expect(page.getByTestId("input-r")).toHaveValue("2");
  await expect(page.getByTestId("surface-total")).toContainText("20π");

  await page.getByTestId("view-solid").click();
  await expect(page.getByTestId("solid-view")).toBeVisible();

  await page.getByTestId("shape-sphere").click();
  await expect(page.getByTestId("view-net")).toBeDisabled();
  await expect(page.getByTestId("solid-view")).toBeVisible();

  // The reason the Net tab is greyed out is always in the document, for anyone
  // reading it through the tab, but it is only laid out on screen for someone
  // pointing at the tab and asking.
  const reason = page.getByTestId("no-net-reason");
  await expect(reason).toContainText("no flat net");
  expect((await reason.boundingBox())?.width).toBeLessThan(10);
  await page.getByTestId("view-net").hover({ force: true });
  await expect
    .poll(async () => (await reason.boundingBox())?.width)
    .toBeGreaterThan(100);
});

/** Where an element sits on the page, which is comparable across the views. */
function placeOf(locator: Locator) {
  return locator.first().evaluate((element) => {
    const box = element.getBoundingClientRect();
    return [box.x, box.y, box.width, box.height];
  });
}

/**
 * Watch the fold for the two frames at its very ends, from inside the page.
 * Reading them afterwards would always be a frame or two late, and it is
 * precisely the first and last frames that have to line up with the views
 * either side of them.
 */
async function watchFoldEnds(page: Page, surfaceId: string) {
  await page.evaluate((id) => {
    const ends: Record<string, number[]> = {};
    (window as unknown as { __foldEnds: typeof ends }).__foldEnds = ends;
    const tick = () => {
      const fold = document.querySelector("[data-testid=fold-view]");
      const shut = fold?.getAttribute("data-closedness");
      const piece = fold?.querySelector(`polygon[data-surface="${id}"]`);
      if (piece && (shut === "1.000" || shut === "0.000")) {
        const box = piece.getBoundingClientRect();
        ends[shut] = [box.x, box.y, box.width, box.height];
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, surfaceId);

  return async () =>
    page.evaluate(
      () =>
        (window as unknown as { __foldEnds: Record<string, number[]> })
          .__foldEnds,
    );
}

function agreeWithin(a: number[], b: number[], slack: number) {
  a.forEach((value, index) => expect(value).toBeCloseTo(b[index], slack));
}

test("folds the solid out into its net and back, from the pose it was left in", async ({
  page,
}) => {
  await page.getByTestId("shape-cube").click();

  // Turn the cube well away from its home view, so a fold that ignored the
  // current pose would be obvious.
  await page.getByTestId("solid-view").focus();
  for (let press = 0; press < 4; press += 1)
    await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowUp");

  const ends = await watchFoldEnds(page, "cube:front");
  const standing = await placeOf(face(page, "cube:front"));

  await page.getByTestId("view-net").click();
  await expect(page.getByTestId("fold-view")).toBeAttached();
  await expect(page.getByTestId("net-view")).toBeVisible();
  await expect(page.getByTestId("fold-view")).toHaveCount(0);
  const flat = await placeOf(
    page
      .getByTestId("net-view")
      .locator('g[data-target="surface:cube:front"] polygon'),
  );

  // Folding back up leaves the solid exactly as it was found.
  await page.getByTestId("view-solid").click();
  await expect(page.getByTestId("solid-view")).toBeVisible();
  await expect(page.getByTestId("fold-view")).toHaveCount(0);
  agreeWithin(await placeOf(face(page, "cube:front")), standing, 1);

  // The fold starts on the solid and finishes on the net, to the pixel, so
  // neither handover moves anything on screen.
  const frames = await ends();
  agreeWithin(frames["1.000"], standing, 1);
  agreeWithin(frames["0.000"], flat, 1);
});

test("goes straight to the net when motion is not wanted", async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator("[data-ready=true]")).toBeAttached();

  await page.getByTestId("view-net").click();
  await expect(page.getByTestId("net-view")).toBeVisible();
  await expect(page.getByTestId("fold-view")).toHaveCount(0);
  await context.close();
});

test("switches straight over for a shape whose net does not fold up", async ({
  page,
}) => {
  // The logo tile is laid out as loose parts on a workbench rather than as one
  // joined sheet, so there is no fold to show and it simply changes view.
  await page.getByTestId("brand-toggle").click();
  await expect(page.getByTestId("input-m")).toHaveValue("4");

  await page.getByTestId("view-net").click();
  await expect(page.getByTestId("net-view")).toBeVisible();
  await expect(page.getByTestId("fold-view")).toHaveCount(0);
});

test("floats over other tabs and returns with its state", async ({
  page,
  context,
}) => {
  const floatButton = page.getByTestId("toggle-float");
  await expect(floatButton).toBeEnabled();
  await page.getByTestId("shape-cube").click();

  const floatingPagePromise = context.waitForEvent("page");
  await floatButton.click();
  const floatingPage = await floatingPagePromise;

  await expect(page.getByTestId("floating-placeholder")).toBeVisible();
  await expect(floatingPage.getByTestId("solid-view")).toBeVisible();
  await expect(floatingPage.getByTestId("surface-total")).toContainText("24");

  // The floating copy is a fully interactive Svelte root, not a static image.
  await floatingPage.getByTestId("input-s").fill("3");
  await expect(floatingPage.getByTestId("surface-total")).toContainText("54");

  // It offers no way back of its own: that is the browser's own back-to-tab
  // button, which returns the viewer to the tab and not just the lab.
  await expect(floatingPage.getByTestId("toggle-float")).toHaveCount(0);

  // Closing the floating window, however it is closed, brings the lab home.
  await floatingPage.close();
  await expect(page.getByTestId("floating-placeholder")).toHaveCount(0);
  await expect(page.getByTestId("solid-view")).toBeVisible();
  await expect(page.getByTestId("surface-total")).toContainText("54");

  // The tab it left behind can also call it back.
  const reopenedPagePromise = context.waitForEvent("page");
  await page.getByTestId("toggle-float").click();
  const reopenedPage = await reopenedPagePromise;
  await reopenedPage.getByTestId("solid-view").waitFor();
  await page.getByTestId("return-to-tab").click();
  await expect(page.getByTestId("solid-view")).toBeVisible();
  await expect(page.getByTestId("surface-total")).toContainText("54");
});

test("folds its controls down to fit the floating window", async ({
  page,
  context,
}) => {
  const floatingPagePromise = context.waitForEvent("page");
  await page.getByTestId("toggle-float").click();
  const floatingPage = await floatingPagePromise;
  await floatingPage.getByTestId("solid-view").waitFor();

  // The picker folds into one button showing the solid that is on the stage,
  // and the maker's mark stands down: the little window is for the shape.
  await expect(floatingPage.getByTestId("shape-picker")).toBeVisible();
  await expect(floatingPage.getByTestId("shape-cube")).toHaveCount(0);
  await expect(floatingPage.getByTestId("brand-toggle")).toHaveCount(0);
  // The language belongs to the page it came from, not to the pane.
  await expect(floatingPage.getByTestId("language-picker")).toHaveCount(0);

  // The list behind it is the same icons, and no names: the drawing of a cone
  // says what "cone" would, in less room.
  await floatingPage.getByTestId("shape-picker").click();
  const option = floatingPage.getByTestId("shape-cone");
  await expect(option).toHaveText("");
  await option.click();
  await expect(floatingPage.getByTestId("input-r")).toBeVisible();
  await expect(floatingPage.getByTestId("shape-list")).toHaveCount(0);

  // The nudge arrows go; recentre and spin, which dragging cannot do, stay,
  // and they stay where they have always been: the middle of the bottom edge.
  await expect(floatingPage.getByTestId("rotate-left")).toHaveCount(0);
  await expect(floatingPage.getByTestId("rotate-right")).toHaveCount(0);
  await expect(floatingPage.getByTestId("reset-view")).toBeVisible();
  await expect(floatingPage.getByTestId("toggle-spin")).toBeVisible();

  const spin = (await floatingPage.getByTestId("toggle-spin").boundingBox())!;
  const dimensions = (await floatingPage
    .getByLabel(/Dimensions/)
    .boundingBox())!;
  const answers = (await floatingPage.getByLabel("Totals").boundingBox())!;
  const width = floatingPage.viewportSize()!.width;
  expect(Math.abs(spin.x + spin.width / 2 - width / 2)).toBeLessThan(
    width * 0.12,
  );
  expect(spin.y).toBeGreaterThan(floatingPage.viewportSize()!.height * 0.6);

  // The dimensions stay a column, one under the next, as they are in the tab.
  const inputs = ["r", "h"].map((key) =>
    floatingPage.getByTestId(`input-${key}`),
  );
  const boxes = await Promise.all(inputs.map((input) => input.boundingBox()));
  expect(boxes[1]!.y).toBeGreaterThan(boxes[0]!.y + boxes[0]!.height / 2);
  expect(Math.abs(boxes[1]!.x - boxes[0]!.x)).toBeLessThan(2);
  expect(dimensions.x).toBeLessThan(answers.x);

  // And the generic units are said the short way.
  await expect(floatingPage.getByTestId("surface-total")).toContainText(
    "sq units",
  );
  await expect(floatingPage.getByTestId("volume-total")).toContainText(
    "cu units",
  );

  // The tab it comes home to is the full-sized lab again.
  await floatingPage.close();
  await expect(page.getByTestId("shape-cone")).toBeVisible();
  await expect(page.getByTestId("rotate-left")).toBeVisible();
  await expect(page.getByTestId("surface-total")).toContainText("square units");
  await expect(page.getByTestId("language-picker")).toBeVisible();
});

test("keeps the view controls level with the panels for as long as they fit", async ({
  page,
  context,
}) => {
  const floatingPagePromise = context.waitForEvent("page");
  await page.getByTestId("toggle-float").click();
  const floatingPage = await floatingPagePromise;
  await floatingPage.getByTestId("solid-view").waitFor();

  // The panel the controls sit in, not the button inside it: what is being
  // compared is where the three panels stand, not where their contents do.
  const controls = () => floatingPage.getByTestId("toggle-spin").locator("..");
  const answers = () => floatingPage.getByLabel("Totals");
  const dimensions = () => floatingPage.getByLabel(/Dimensions/);
  const foot = async (locator: ReturnType<typeof answers>) => {
    const box = (await locator.boundingBox())!;
    return box.y + box.height;
  };
  const level = async () =>
    Math.max(
      Math.abs((await foot(controls())) - (await foot(answers()))),
      Math.abs((await foot(controls())) - (await foot(dimensions()))),
    );

  // Room for all three, and room to spare: the controls take the middle of the
  // window, standing on the same line as the panels either side of them.
  await floatingPage.setViewportSize({ width: 620, height: 520 });
  await expect.poll(level).toBeLessThan(4);
  const roomy = (await controls().boundingBox())!;
  expect(Math.abs(roomy.x + roomy.width / 2 - 620 / 2)).toBeLessThan(620 * 0.1);

  // Squeezed until the middle of the window is out of reach — the answers panel
  // is much the wider of the two, so it runs out of room while the gap on the
  // other side is still wide open. The controls keep the line regardless.
  await floatingPage.setViewportSize({ width: 400, height: 420 });
  await expect.poll(level).toBeLessThan(4);
  const tight = (await controls().boundingBox())!;
  const left = (await dimensions().boundingBox())!;
  const right = (await answers().boundingBox())!;
  expect(tight.x).toBeGreaterThan(left.x + left.width);
  expect(tight.x + tight.width).toBeLessThan(right.x);

  // Smaller again, and the panels give up the row themselves; the controls stay
  // at the bottom of the window, still centred.
  await floatingPage.setViewportSize({ width: 320, height: 460 });
  await expect
    .poll(async () => (await foot(controls())) - (await foot(answers())))
    .toBeGreaterThan(8);
  const stacked = (await controls().boundingBox())!;
  expect(Math.abs(stacked.x + stacked.width / 2 - 320 / 2)).toBeLessThan(
    320 * 0.1,
  );
});

test("floats validation errors without moving the floating controls", async ({
  page,
  context,
}) => {
  const floatingPagePromise = context.waitForEvent("page");
  await page.getByTestId("toggle-float").click();
  const floatingPage = await floatingPagePromise;
  await floatingPage.getByTestId("solid-view").waitFor();
  await floatingPage.setViewportSize({ width: 420, height: 440 });

  const place = async (testid: string) => {
    const box = (await floatingPage.getByTestId(testid).boundingBox())!;
    return [box.x, box.y, box.width, box.height].map(Math.round);
  };
  const dimensions = floatingPage.getByLabel(/Dimensions/);
  const panelBefore = (await dimensions.boundingBox())!;
  const totalsBefore = await place("surface-total");
  const controlsBefore = await place("toggle-spin");

  // Clearing a box is a normal part of replacing its value. The complaint is a
  // bubble above the panel, not another row inside it, so none of the furniture
  // jumps while the draft is briefly invalid.
  await floatingPage.getByTestId("input-l").fill("");
  await expect(floatingPage.getByTestId("error-l")).toBeVisible();
  await expect(floatingPage.getByTestId("error-l")).toContainText(
    "Enter a number",
  );
  const panelAfter = (await dimensions.boundingBox())!;
  expect([
    panelAfter.x,
    panelAfter.y,
    panelAfter.width,
    panelAfter.height,
  ].map(Math.round)).toEqual(
    [
      panelBefore.x,
      panelBefore.y,
      panelBefore.width,
      panelBefore.height,
    ].map(Math.round),
  );
  expect(await place("surface-total")).toEqual(totalsBefore);
  expect(await place("toggle-spin")).toEqual(controlsBefore);

  // A valid replacement dismisses the bubble and updates the model normally.
  await floatingPage.getByTestId("input-l").fill("6");
  await expect(floatingPage.getByTestId("error-l")).toHaveCount(0);
  await expect(floatingPage.getByTestId("surface-total")).toContainText("148");
});

test("keeps long working inside its panel in a floating window", async ({
  page,
  context,
}) => {
  const floatingPagePromise = context.waitForEvent("page");
  await page.getByTestId("toggle-float").click();
  const floatingPage = await floatingPagePromise;
  await floatingPage.getByTestId("solid-view").waitFor();
  await floatingPage.setViewportSize({ width: 520, height: 440 });

  const inside = async (
    panel: ReturnType<typeof floatingPage.getByLabel>,
    content: ReturnType<typeof floatingPage.getByLabel>,
  ) => {
    const outer = (await panel.boundingBox())!;
    const inner = (await content.boundingBox())!;
    return {
      right: outer.x + outer.width - (inner.x + inner.width),
      bottom: outer.y + outer.height - (inner.y + inner.height),
    };
  };

  // A pyramid's slant height is the longest thing the dimensions panel ever
  // says: "s = √(4² + (6/2)²) = 5". The panel keeps it, rather than running it
  // out through its own edge, where the panel's scrolling would cut it off.
  await floatingPage.getByTestId("shape-picker").click();
  await floatingPage.getByTestId("shape-squarePyramid").click();
  const derived = await inside(
    floatingPage.getByLabel(/Dimensions/),
    floatingPage.getByTestId("derived-s"),
  );
  expect(derived.right).toBeGreaterThanOrEqual(0);
  expect(derived.bottom).toBeGreaterThanOrEqual(0);

  // Same for the formulas, which otherwise push the buttons beside them out
  // through the right-hand edge of the totals card.
  await floatingPage.getByTestId("shape-picker").click();
  await floatingPage.getByTestId("shape-sphere").click();
  await floatingPage.getByTestId("toggle-formulas").click();
  const totals = floatingPage.getByLabel("Totals");
  for (const testid of ["surface-substitution", "volume-substitution"]) {
    const working = await inside(totals, floatingPage.getByTestId(testid));
    expect(working.right).toBeGreaterThanOrEqual(0);
    expect(working.bottom).toBeGreaterThanOrEqual(0);
  }
  const buttons = await inside(
    totals,
    floatingPage.getByTestId("toggle-formulas"),
  );
  expect(buttons.right).toBeGreaterThanOrEqual(0);
  expect(buttons.bottom).toBeGreaterThanOrEqual(0);

  // And the card keeps to its half of a small window: the rounded reading goes
  // under the exact answer there rather than trailing after it.
  const card = (await totals.boundingBox())!;
  expect(card.width).toBeLessThan(520 * 0.55);

  // Narrower still, and the working goes altogether, along with the nudge
  // buttons it keeps company with: what is left is the dimensions themselves.
  await floatingPage.setViewportSize({ width: 400, height: 440 });
  await floatingPage.getByTestId("shape-picker").click();
  await floatingPage.getByTestId("shape-squarePyramid").click();
  await expect(floatingPage.getByTestId("decrease-b")).toBeHidden();
  await expect(floatingPage.getByTestId("derived-s")).toBeHidden();
  await expect(floatingPage.getByTestId("input-b")).toBeVisible();
});

test("keeps a pyramid's face labels apart, and its answer in its panel", async ({
  page,
  context,
}) => {
  const floatingPagePromise = context.waitForEvent("page");
  await page.getByTestId("toggle-float").click();
  const floatingPage = await floatingPagePromise;
  await floatingPage.getByTestId("solid-view").waitFor();
  await floatingPage.setViewportSize({ width: 455, height: 515 });
  await floatingPage.getByTestId("shape-picker").click();
  await floatingPage.getByTestId("shape-squarePyramid").click();
  // A slant height of √73: the longest thing any net says, on all four faces.
  await floatingPage.getByTestId("input-h").fill("8");

  // Both answers are set to the same size as each other, and the panel holding
  // them keeps to its side of the window however long the exact answer runs.
  const sizeOf = (testid: string) =>
    floatingPage
      .getByTestId(testid)
      .evaluate((node) => getComputedStyle(node).fontSize);
  expect(await sizeOf("surface-total")).toBe(await sizeOf("volume-total"));
  const card = (await floatingPage.getByLabel("Totals").boundingBox())!;
  expect(card.width).toBeLessThan(455 * 0.62);

  // Smaller again, where the net is drawn small against labels that are not:
  // this is the size at which one line per face used to write over the next.
  await floatingPage.setViewportSize({ width: 360, height: 420 });
  await floatingPage.getByTestId("view-net").click();
  await expect(floatingPage.getByTestId("net-view")).toBeVisible();
  await floatingPage.waitForTimeout(1200);

  // Every piece says its size without writing over what the piece next to it
  // says: the four faces meet at the narrowest part of this net, which is why
  // their label is set on two lines rather than one.
  const overlaps = await floatingPage.evaluate(() => {
    const boxes = [
      ...document.querySelectorAll("[data-testid='net-view'] text"),
    ].map((text) => text.getBoundingClientRect());
    const hits: string[] = [];
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i];
        const b = boxes[j];
        const across = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const down = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        // Haloed text can sit shoulder to shoulder; what counts as a collision
        // is one label reaching well into the body of another.
        if (across > 4 && down > 4) hits.push(`${i}×${j}`);
      }
    }
    return hits;
  });
  expect(overlaps).toEqual([]);
});

test("keeps the labels on the shape when the floating window is resized", async ({
  page,
  context,
}) => {
  const floatingPagePromise = context.waitForEvent("page");
  await page.getByTestId("toggle-float").click();
  const floatingPage = await floatingPagePromise;
  await floatingPage.getByTestId("solid-view").waitFor();
  await floatingPage.setViewportSize({ width: 600, height: 600 });

  const badge = floatingPage.getByTestId("surface-top");
  const narrow = (await badge.boundingBox())!;
  expect(narrow.x).toBeLessThan(600);

  // The floating window is a second document, so it is resized without the
  // tab's own observers hearing about it. The badge is positioned in CSS
  // pixels over the drawing, so it is the first thing to be left behind.
  await floatingPage.setViewportSize({ width: 1000, height: 500 });
  const stage = floatingPage.getByTestId("solid-view");
  await expect
    .poll(async () => (await badge.boundingBox())!.x, { timeout: 5000 })
    .toBeGreaterThan(narrow.x + 100);

  const box = (await stage.boundingBox())!;
  const moved = (await badge.boundingBox())!;
  // The top face of a cube is over the middle of it, wherever the middle now is.
  expect(Math.abs(moved.x - box.width / 2)).toBeLessThan(box.width * 0.3);
});

test("holds the shape clear of a crowded bottom edge while floating", async ({
  page,
  context,
}) => {
  const floatingPagePromise = context.waitForEvent("page");
  await page.getByTestId("toggle-float").click();
  const floatingPage = await floatingPagePromise;
  await floatingPage.getByTestId("solid-view").waitFor();
  await floatingPage.setViewportSize({ width: 420, height: 380 });
  await expect(floatingPage.getByTestId("surface-top")).toBeVisible();

  const shape = async () =>
    await floatingPage.evaluate(() => {
      const faces = Array.from(
        document.querySelectorAll("[data-testid='solid-view'] polygon"),
      ).map((face) => face.getBoundingClientRect());
      return {
        top: Math.min(...faces.map((face) => face.top)),
        bottom: Math.max(...faces.map((face) => face.bottom)),
      };
    });

  const drawn = await shape();
  const panel = (await floatingPage.getByLabel(/Dimensions/).boundingBox())!;
  const middle = (drawn.top + drawn.bottom) / 2;

  // The shape sits above the middle of the window, because the panels below it
  // take more room than the row above it does.
  expect(middle).toBeLessThan(380 / 2);
  // It may graze a panel, but it is not buried behind one: nearly all of it is
  // still in the clear.
  const clear = (panel.y - drawn.top) / (drawn.bottom - drawn.top);
  expect(clear).toBeGreaterThan(0.8);
  expect(drawn.top).toBeGreaterThan(0);
});

test("stops auto-rotation when a net is shown", async ({ page }) => {
  await page.getByTestId("toggle-spin").click();
  await expect(page.getByTestId("toggle-spin")).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.getByTestId("view-net").click();
  await expect(page.getByTestId("toggle-spin")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(page.getByTestId("toggle-spin")).toBeDisabled();
});

test("measures a face while the pointer is on it", async ({ page }) => {
  const badge = page.getByTestId("surface-front");
  await expect(badge).toHaveText("F");

  await pointAtFace(page, "rectangularPrism:front");
  await expect(badge).toContainText("Front face");
  await expect(badge).toContainText("= 15");
  // The working belongs to the formula toggle, not to the face.
  await expect(badge).not.toContainText("l × h");

  // Letting go of the face puts the measurement away again.
  await pointAway(page);
  await expect(badge).toHaveText("F");

  // With formulas switched on, the same face shows its working too.
  await page.getByTestId("toggle-formulas").click();
  await pointAtFace(page, "rectangularPrism:front");
  await expect(badge).toContainText("l × h");
  await expect(badge).toContainText("3 × 5 = 15");
});

test("keeps a measurement on screen once its face is clicked", async ({
  page,
}) => {
  const badge = page.getByTestId("surface-top");
  await pointAtFace(page, "rectangularPrism:top", true);
  await expect(badge).toHaveAttribute("aria-pressed", "true");

  await pointAway(page);
  await expect(badge).toContainText("= 12");

  // The same surface stays highlighted in the net, and comes back when the
  // solid does.
  await page.getByTestId("view-net").click();
  await expect(page.getByTestId("net-view")).toBeVisible();
  await page.getByTestId("view-solid").click();
  await expect(badge).toHaveAttribute("aria-pressed", "true");

  // Clicking again puts it away, and changing solid clears everything.
  await pointAtFace(page, "rectangularPrism:top", true);
  await pointAway(page);
  await expect(badge).toHaveText("T");

  await pointAtFace(page, "rectangularPrism:front", true);
  await page.getByTestId("shape-cube").click();
  await pointAway(page);
  await expect(page.getByTestId("surface-front")).toHaveText("F");
});

test("measures an edge on hover and pins it on click", async ({ page }) => {
  const label = page.getByTestId("measure-label");
  await expect(label).toHaveCount(0);

  // Pointing is enough to read a length, and letting go puts it away.
  await pointAtEdge(page, "w");
  await expect(label).toHaveText(/w = 4 units/);
  await pointAway(page);
  await expect(label).toHaveCount(0);

  // Clicking makes it stay.
  await pointAtEdge(page, "h", true);
  await pointAway(page);
  await expect(label).toHaveText(/h = 5 units/);

  // A pinned length still tracks the dimension it measures.
  await page.getByTestId("input-h").fill("7");
  await expect(label).toHaveText(/h = 7 units/);

  // Clicking the label lets the length go; it lingers only while pointed at.
  await label.click();
  await expect(label).toHaveAttribute("aria-pressed", "false");
  await pointAway(page);
  await expect(label).toHaveCount(0);
});

test("shows a derived length with its working", async ({ page }) => {
  await page.getByTestId("shape-cone").click();
  await pointAtEdge(page, "s");
  const label = page.getByTestId("measure-label");
  await expect(label).toContainText("s = √(3² + 4²)");
  await expect(label).toContainText("s = 5 units");
});

test("hides final answers without hiding the formulas, and keeps the choice", async ({
  page,
}) => {
  await page.getByTestId("toggle-formulas").click();
  await page.getByTestId("toggle-answers").click();

  await expect(page.getByTestId("surface-total-hidden")).toBeVisible();
  await expect(page.getByTestId("volume-total-hidden")).toBeVisible();

  // A face still shows its working, but not its result.
  await pointAtFace(page, "rectangularPrism:front");
  await expect(page.getByTestId("surface-front")).toContainText("3 × 5 = ?");

  // Formulas and substitutions stay on screen for discussion.
  await expect(page.getByTestId("surface-formula")).toContainText(
    "SA = 2(lw + lh + wh)",
  );
  await expect(page.getByTestId("surface-substitution")).toContainText(
    "2(3 × 4 + 3 × 5 + 4 × 5)",
  );
  await expect(page.getByTestId("volume-substitution")).toContainText(
    "3 × 4 × 5",
  );

  // No evaluated result in the rendered text, nor in anything a screen reader
  // or tooltip would announce. Drawing coordinates are excluded on purpose:
  // they are geometry, not a readable answer.
  const leaked = await page.evaluate(() => {
    const secrets = ["94", "60", "15"];
    const announced = [
      "title",
      "alt",
      "placeholder",
      "aria-label",
      "aria-description",
      "aria-valuetext",
      "aria-roledescription",
    ];
    const spoken: string[] = [];
    for (const element of document.querySelectorAll("*")) {
      for (const name of announced) {
        const value = element.getAttribute(name);
        if (value) spoken.push(value);
      }
    }
    return {
      inText: secrets.filter((secret) =>
        document.body.innerText.includes(secret),
      ),
      inAnnouncedText: secrets.filter((secret) =>
        spoken.some((value) => value.includes(secret)),
      ),
    };
  });
  expect(leaked.inText).toEqual([]);
  expect(leaked.inAnnouncedText).toEqual([]);

  // The choice survives a view change and a shape change.
  await page.getByTestId("view-net").click();
  await expect(page.getByTestId("surface-total-hidden")).toBeVisible();
  await page.getByTestId("shape-cube").click();
  await expect(page.getByTestId("surface-total-hidden")).toBeVisible();

  // Revealing shows the current geometry, not the shape we started on.
  await page.getByTestId("toggle-answers").click();
  await expect(page.getByTestId("surface-total")).toContainText("24");
  await expect(page.getByTestId("volume-total")).toContainText("8");
});

test("rotates with the keyboard without changing any calculated value", async ({
  page,
}) => {
  const view = page.getByTestId("solid-view");
  // The drawn outlines are what rotation changes; attribute order in the
  // markup is not meaningful.
  const outlines = () =>
    view
      .locator("polygon")
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("points")));

  const before = await outlines();
  const numbers = await totals(page);

  await view.focus();
  for (let i = 0; i < 4; i += 1) await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");

  await expect.poll(async () => await outlines()).not.toEqual(before);
  expect(await totals(page)).toEqual(numbers);

  await page.getByTestId("reset-view").click();
  await expect.poll(async () => await outlines()).toEqual(before);
});

test("relabels units without converting the numbers", async ({ page }) => {
  await expect(page.getByTestId("surface-total")).toContainText("square units");
  await page.getByTestId("unit-select").selectOption("cm");
  await expect(page.getByTestId("surface-total")).toContainText("94");
  await expect(page.getByTestId("surface-total")).toContainText("cm²");
  await expect(page.getByTestId("volume-total")).toContainText("cm³");
});

test("says what one grid square is worth, in either view", async ({ page }) => {
  // The drawing is always fitted to the screen, so the grid is the only thing
  // that says how big the shape is — and the key is the only thing that says
  // how big the grid is.
  const key = page.getByTestId("grid-key");
  await expect(key).toContainText("1 units");
  await page.getByTestId("unit-select").selectOption("cm");
  await expect(key).toContainText("1 cm");

  // The step is a round number of units at any size, so a much larger shape is
  // measured by much larger squares rather than by a denser grid.
  await page.getByTestId("input-l").fill("300");
  await page.getByTestId("input-w").fill("300");
  await page.getByTestId("input-h").fill("300");
  await expect(key).toContainText(/\b(10|20|100) cm$/);

  await page.getByTestId("input-l").fill("3");
  await page.getByTestId("input-w").fill("4");
  await page.getByTestId("input-h").fill("5");
  await page.getByTestId("view-net").click();
  await expect(page.getByTestId("net-view")).toBeVisible();
  await expect(page.getByTestId("grid-key")).toContainText("1 cm");
});

test("supports every essential action from the keyboard alone", async ({
  page,
}) => {
  await page.getByTestId("shape-cone").press("Enter");
  await expect(page.getByTestId("surface-total")).toContainText("24π");

  await page.getByTestId("input-r").fill("6");
  await expect(page.getByTestId("volume-total")).toContainText("48π");

  // A face, measured from its badge rather than by pointing at it.
  await page.getByTestId("surface-side").press("Enter");
  await expect(page.getByTestId("surface-side")).toContainText("Curved side");

  // A length, measured from the dimension bar rather than from the shape.
  await page.getByTestId("measure-h").press("Enter");
  await expect(page.getByTestId("measure-label")).toHaveText(/h = 4 units/);

  await page.getByTestId("view-net").press("Enter");
  await expect(page.getByTestId("net-view")).toBeVisible();

  await page.getByTestId("toggle-answers").press("Enter");
  await expect(page.getByTestId("surface-total-hidden")).toBeVisible();
});

test("gives the shape the screen, with one panel in each corner", async ({
  page,
}) => {
  const stage = page.getByTestId("solid-view").boundingBox();
  const viewport = page.viewportSize();
  const box = await stage;
  // The drawing is the page, not a pane inside it.
  expect(box?.width).toBeGreaterThan((viewport?.width ?? 0) * 0.95);
  expect(box?.height).toBeGreaterThan((viewport?.height ?? 0) * 0.9);

  await expect(page.getByTestId("shape-cube")).toBeVisible();
  await expect(page.getByTestId("input-l")).toBeVisible();
  await expect(page.getByTestId("surface-total")).toBeVisible();
  await expect(page.getByTestId("view-net")).toBeVisible();
});

test("stays usable on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();

  await expect(page.getByTestId("solid-view")).toBeVisible();
  await expect(page.getByTestId("shape-cylinder")).toBeVisible();
  await expect(page.getByTestId("input-l")).toBeVisible();
  await expect(page.getByTestId("surface-total")).toContainText("94");

  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test("takes typed sizes far past the slider, while the slider stays bounded", async ({
  page,
}) => {
  await page.getByTestId("input-l").fill("2500");
  await expect(page.getByTestId("error-l")).toHaveCount(0);
  // 2500 × the other two default dimensions.
  await expect(page.getByTestId("volume-total")).toContainText("50000");

  const range = page.getByTestId("range-l");
  await expect(range).toHaveAttribute("max", "20");
  // The handle rests at the top of the slider's own range until it is dragged.
  await expect(range).toHaveValue("20");

  await page.getByTestId("decrease-l").click();
  await expect(page.getByTestId("input-l")).toHaveValue("2499.9");
});

test("keeps rounded decimals short, with the detail a hover away", async ({
  page,
}) => {
  await page.getByTestId("shape-cylinder").click();
  const approx = page.getByTestId("surface-total-approx");

  // Only the visible form counts: the other is display:none until hovered.
  await expect(approx).toHaveText("≈ 62.8", { useInnerText: true });
  await approx.hover();
  await expect(approx).toHaveText("≈ 62.83185", { useInnerText: true });
});

test("folds the footer into a chip that stays clear of the controls", async ({
  page,
}) => {
  const toggle = page.getByTestId("brand-toggle");
  const panel = page.getByTestId("brand-panel");

  // Folded up, it is a logo and nothing else. The links stay in the document
  // for the keyboard, so what says they are folded is the screen-reader-only
  // box they sit in, not their absence.
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect((await panel.boundingBox())!.width).toBeLessThan(10);

  // Pointing at it is enough; a click is only there for touch.
  await toggle.hover();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(panel).toContainText("Built by teacher.dev");
  expect((await panel.boundingBox())!.width).toBeGreaterThan(100);
});

test("keeps the brand chip out of the way on a narrow screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();

  const chip = await page.getByTestId("brand-toggle").boundingBox();
  const first = await page.getByTestId("shape-rectangularPrism").boundingBox();
  const lastOnRow = await page
    .getByTestId("shape-triangularPrism")
    .boundingBox();
  const view = await page.getByTestId("view-solid").boundingBox();

  // The top edge is the tightest row on a phone. The mark leads the row, and
  // what follows it still has to clear the view controls opposite.
  expect(chip!.x + chip!.width).toBeLessThanOrEqual(first!.x);
  expect(lastOnRow!.x + lastOnRow!.width).toBeLessThan(view!.x);
});

test("keeps the logo out of the shape picker, and behind the mark", async ({
  page,
}) => {
  // It is not one of the six on offer.
  await expect(page.getByTestId("shape-logoSlab")).toHaveCount(0);

  await page.getByTestId("brand-toggle").click();

  // The top radius is 1, the bottom radius is 1 + 1.5, and the 2-high
  // bevel has a 2.5-long outside edge. The analytic totals stay exact.
  await expect(page.getByTestId("surface-total")).toContainText("128");
  await expect(page.getByTestId("surface-total")).toContainText("16π");
  await expect(page.getByTestId("volume-total")).toContainText("88");
  await expect(page.getByTestId("volume-total")).toContainText("6.5π");

  // It is a solid like any other: it has a net and its own dimensions, while
  // the slanted edge t is correctly derived rather than entered independently.
  await expect(page.getByTestId("input-m")).toHaveValue("4");
  await expect(page.getByTestId("input-r")).toHaveValue("1");
  await expect(page.getByTestId("input-b")).toHaveValue("1.5");
  await expect(page.getByTestId("input-h")).toHaveValue("2");
  await expect(page.getByTestId("derived-t")).toContainText("2.5");
  await page.getByTestId("view-net").click();
  await expect(page.getByTestId("net-view")).toBeVisible();
});

test("reaches the about and privacy pages from the chip", async ({ page }) => {
  await page.getByTestId("brand-toggle").hover();
  await page.getByTestId("brand-about").click();

  await expect(page).toHaveURL(/\/about$/);
  await expect(
    page.getByRole("heading", { name: "About", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /support@teacher\.dev/ }),
  ).toBeVisible();

  await page.getByRole("link", { name: "privacy" }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(
    page.getByText("does not collect personal information"),
  ).toBeVisible();

  await page.getByTestId("back-to-lab").click();
  await expect(page.getByTestId("solid-view")).toBeVisible();
});
