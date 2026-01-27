import { test, expect } from "@playwright/test";

test.describe("Setup Wizard", () => {
  // Mock API routes before each test
  test.beforeEach(async ({ page }) => {
    // Mock test-key endpoint
    await page.route("**/api/setup/test-key", async (route) => {
      const request = route.request();
      const body = JSON.parse(request.postData() || "{}");
      const { service, apiKey } = body;

      // Simulate successful validation for valid test keys
      if (apiKey && apiKey.startsWith("valid-")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            message: `${service} API key is valid`,
          }),
        });
      } else if (apiKey && apiKey.startsWith("invalid-")) {
        // Simulate invalid key error
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            error: "Invalid API key",
          }),
        });
      } else {
        // Simulate generic error
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            error: "Validation failed",
          }),
        });
      }
    });

    // Mock save-key endpoint
    await page.route("**/api/setup/save-key", async (route) => {
      const request = route.request();
      const body = JSON.parse(request.postData() || "{}");
      const { service, apiKey } = body;

      // Simulate successful save (or skip when apiKey is empty)
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: apiKey
            ? `${service} API key saved successfully`
            : `Skipped ${service} API key configuration`,
          skipped: !apiKey,
        }),
      });
    });
  });

  test("should display Step 1 with App Secret on load", async ({ page }) => {
    await page.goto("/setup");

    // Check page title and description
    await expect(page.getByText("Setup Wizard")).toBeVisible();
    await expect(
      page.getByText("Configure your YouTube AI Summarizer")
    ).toBeVisible();

    // Check Step 1 header
    await expect(page.getByText("Step 1: App Secret")).toBeVisible();

    // Check step indicators (1 should be active)
    const stepIndicators = page.locator(
      ".flex.items-center.justify-center.w-8.h-8.rounded-full"
    );
    await expect(stepIndicators).toHaveCount(4);

    // Check that generated secret section is visible (the label text)
    await expect(page.getByText("Generated Secret")).toBeVisible();

    // Check that the secret input field is visible (readonly text input)
    const secretInput = page.locator('input[readonly]').first();
    await expect(secretInput).toBeVisible();

    // Check Next button is enabled (secret is auto-generated with valid length)
    const nextButton = page.getByRole("button", { name: /Next/i });
    await expect(nextButton).toBeVisible();
    await expect(nextButton).toBeEnabled();
  });

  test("should allow copying the generated secret", async ({ page, context }) => {
    // Grant clipboard permissions for the test
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.goto("/setup");

    // Wait for secret to be generated (readonly input field)
    const secretInput = page.locator('input[readonly]').first();
    await expect(secretInput).toBeVisible();

    // Wait for the secret to be populated (generated in useEffect)
    await expect(secretInput).not.toHaveValue("", { timeout: 5000 });

    // Get the secret value before copying
    const secretValue = await secretInput.inputValue();
    expect(secretValue.length).toBeGreaterThan(0);

    // Click copy button
    const copyButton = page.getByRole("button", { name: /Copy to clipboard/i });
    await copyButton.click();

    // Wait a moment for the state to update
    await page.waitForTimeout(500);

    // The check icon should appear after copying (indicates success)
    // The icon has class "text-green-500" on the parent Check component
    const checkIcon = page.locator(".text-green-500");
    await expect(checkIcon).toBeVisible({ timeout: 3000 });
  });

  test("should allow regenerating the secret", async ({ page }) => {
    await page.goto("/setup");

    // Wait for secret to be generated
    const secretInput = page.getByRole("textbox").first();
    await expect(secretInput).toBeVisible();

    // Get initial secret value
    const initialSecret = await secretInput.inputValue();

    // Click regenerate button
    const regenerateButton = page.getByRole("button", { name: /Generate new secret/i });
    await regenerateButton.click();

    // Secret should change
    await expect(secretInput).not.toHaveValue(initialSecret);
  });

  test("should allow custom secret with validation", async ({ page }) => {
    await page.goto("/setup");

    // Check the custom secret checkbox
    const customCheckbox = page.getByLabel("Use custom secret");
    await customCheckbox.check();

    // Custom secret input should appear
    const customInput = page.getByPlaceholder(
      "Enter your custom secret (min 16 characters)"
    );
    await expect(customInput).toBeVisible();

    // Enter too short secret
    await customInput.fill("short");

    // Error message should appear
    await expect(
      page.getByText("Secret must be at least 16 characters long")
    ).toBeVisible();

    // Next button should be disabled
    const nextButton = page.getByRole("button", { name: /Next/i });
    await expect(nextButton).toBeDisabled();

    // Enter valid length secret
    await customInput.fill("this-is-a-valid-secret-123");

    // Error message should disappear
    await expect(
      page.getByText("Secret must be at least 16 characters long")
    ).not.toBeVisible();

    // Next button should be enabled
    await expect(nextButton).toBeEnabled();
  });

  test("should navigate through all steps using Next", async ({ page }) => {
    await page.goto("/setup");

    // Step 1 - click Next
    await expect(page.getByText("Step 1: App Secret")).toBeVisible();
    await page.getByRole("button", { name: /Next/i }).click();

    // Step 2 - Supadata
    await expect(page.getByText("Step 2: Supadata API Key")).toBeVisible();
    await expect(page.getByPlaceholder("Enter your Supadata API key")).toBeVisible();

    // Click Skip to move to Step 3
    await page.getByRole("button", { name: /Skip/i }).click();

    // Step 3 - Z.AI
    await expect(page.getByText("Step 3: Z.AI API Key")).toBeVisible();
    await expect(page.getByPlaceholder("Enter your Z.AI API key")).toBeVisible();

    // Click Skip to move to Step 4
    await page.getByRole("button", { name: /Skip/i }).click();

    // Step 4 - Fallback Models
    await expect(page.getByText("Step 4: Fallback Models")).toBeVisible();
    await expect(page.getByPlaceholder("Enter your Gemini API key")).toBeVisible();
    await expect(page.getByPlaceholder("Enter your Groq API key")).toBeVisible();
    await expect(page.getByPlaceholder("Enter your OpenAI API key")).toBeVisible();
  });

  test("should navigate back using Back button", async ({ page }) => {
    await page.goto("/setup");

    // Go to Step 2
    await page.getByRole("button", { name: /Next/i }).click();
    await expect(page.getByText("Step 2: Supadata API Key")).toBeVisible();

    // Go back to Step 1
    await page.getByRole("button", { name: /Back/i }).click();
    await expect(page.getByText("Step 1: App Secret")).toBeVisible();

    // Go to Step 3
    await page.getByRole("button", { name: /Next/i }).click();
    await page.getByRole("button", { name: /Skip/i }).click();
    await expect(page.getByText("Step 3: Z.AI API Key")).toBeVisible();

    // Go back to Step 2
    await page.getByRole("button", { name: /Back/i }).click();
    await expect(page.getByText("Step 2: Supadata API Key")).toBeVisible();
  });

  test("should test and validate Supadata API key", async ({ page }) => {
    await page.goto("/setup");

    // Navigate to Step 2
    await page.getByRole("button", { name: /Next/i }).click();
    await expect(page.getByText("Step 2: Supadata API Key")).toBeVisible();

    // Enter API key
    const apiKeyInput = page.getByPlaceholder("Enter your Supadata API key");
    await apiKeyInput.fill("valid-supadata-key");

    // Click Test button
    await page.getByRole("button", { name: /Test/i }).click();

    // Should show success message
    await expect(page.getByText("API key is valid")).toBeVisible();
  });

  test("should show error for invalid API key", async ({ page }) => {
    await page.goto("/setup");

    // Navigate to Step 2
    await page.getByRole("button", { name: /Next/i }).click();
    await expect(page.getByText("Step 2: Supadata API Key")).toBeVisible();

    // Enter invalid API key
    const apiKeyInput = page.getByPlaceholder("Enter your Supadata API key");
    await apiKeyInput.fill("invalid-supadata-key");

    // Click Test button
    await page.getByRole("button", { name: /Test/i }).click();

    // Should show error message
    await expect(page.getByText("Invalid API key")).toBeVisible();
  });

  test("should test and validate Z.AI API key", async ({ page }) => {
    await page.goto("/setup");

    // Navigate to Step 3
    await page.getByRole("button", { name: /Next/i }).click();
    await page.getByRole("button", { name: /Skip/i }).click();
    await expect(page.getByText("Step 3: Z.AI API Key")).toBeVisible();

    // Enter API key
    const apiKeyInput = page.getByPlaceholder("Enter your Z.AI API key");
    await apiKeyInput.fill("valid-zai-key");

    // Click Test button
    await page.getByRole("button", { name: /Test/i }).click();

    // Should show success message
    await expect(page.getByText("API key is valid")).toBeVisible();
  });

  test("should test fallback model API keys in Step 4", async ({ page }) => {
    await page.goto("/setup");

    // Navigate to Step 4
    await page.getByRole("button", { name: /Next/i }).click();
    await page.getByRole("button", { name: /Skip/i }).click();
    await page.getByRole("button", { name: /Skip/i }).click();
    await expect(page.getByText("Step 4: Fallback Models")).toBeVisible();

    // Test Gemini key
    const geminiInput = page.getByPlaceholder("Enter your Gemini API key");
    await geminiInput.fill("valid-gemini-key");
    const testButtons = page.getByRole("button", { name: /Test/i });
    await testButtons.first().click();
    await expect(page.getByText("API key is valid").first()).toBeVisible();

    // Test Groq key
    const groqInput = page.getByPlaceholder("Enter your Groq API key");
    await groqInput.fill("valid-groq-key");
    await testButtons.nth(1).click();
    await expect(page.getByText("API key is valid").nth(1)).toBeVisible();

    // Test OpenAI key
    const openaiInput = page.getByPlaceholder("Enter your OpenAI API key");
    await openaiInput.fill("valid-openai-key");
    await testButtons.nth(2).click();
    await expect(page.getByText("API key is valid").nth(2)).toBeVisible();
  });

  test("should skip all steps and redirect to home", async ({ page }) => {
    await page.goto("/setup");

    // Step 1 - Next
    await page.getByRole("button", { name: /Next/i }).click();

    // Step 2 - Skip
    await expect(page.getByText("Step 2: Supadata API Key")).toBeVisible();
    await page.getByRole("button", { name: /Skip/i }).click();

    // Step 3 - Skip
    await expect(page.getByText("Step 3: Z.AI API Key")).toBeVisible();
    await page.getByRole("button", { name: /Skip/i }).click();

    // Step 4 - Skip
    await expect(page.getByText("Step 4: Fallback Models")).toBeVisible();
    await page.getByRole("button", { name: /Skip/i }).click();

    // Should redirect to home page
    await expect(page).toHaveURL("/");
  });

  test("should complete full wizard with API keys and redirect to home", async ({
    page,
  }) => {
    await page.goto("/setup");

    // Step 1 - Use generated secret and proceed
    await expect(page.getByText("Step 1: App Secret")).toBeVisible();
    await page.getByRole("button", { name: /Next/i }).click();

    // Step 2 - Enter and save Supadata key
    await expect(page.getByText("Step 2: Supadata API Key")).toBeVisible();
    await page
      .getByPlaceholder("Enter your Supadata API key")
      .fill("valid-supadata-key");
    await page.getByRole("button", { name: /Test/i }).click();
    await expect(page.getByText("API key is valid")).toBeVisible();
    // Click Next to save and proceed
    await page.getByRole("button", { name: /^Next$/i }).click();

    // Step 3 - Enter and save Z.AI key
    await expect(page.getByText("Step 3: Z.AI API Key")).toBeVisible();
    await page
      .getByPlaceholder("Enter your Z.AI API key")
      .fill("valid-zai-key");
    await page.getByRole("button", { name: /Test/i }).click();
    await expect(page.getByText("API key is valid")).toBeVisible();
    // Click Next to save and proceed
    await page.getByRole("button", { name: /^Next$/i }).click();

    // Step 4 - Enter and save fallback keys, then Finish
    await expect(page.getByText("Step 4: Fallback Models")).toBeVisible();
    await page
      .getByPlaceholder("Enter your Gemini API key")
      .fill("valid-gemini-key");
    await page.getByPlaceholder("Enter your Groq API key").fill("valid-groq-key");
    await page
      .getByPlaceholder("Enter your OpenAI API key")
      .fill("valid-openai-key");

    // Click Finish
    await page.getByRole("button", { name: /Finish/i }).click();

    // Should redirect to home page
    await expect(page).toHaveURL("/");
  });

  test("should show instructions in Step 1", async ({ page }) => {
    await page.goto("/setup");

    // Check instructions section
    await expect(page.getByText("Instructions")).toBeVisible();
    await expect(
      page.getByText("Copy the secret above using the copy button")
    ).toBeVisible();
    await expect(
      page.getByText(/Open your.*\.env.*file in the project root/i)
    ).toBeVisible();
    await expect(page.getByText(/Add the following line/i)).toBeVisible();
    await expect(page.getByText("APP_SECRET=")).toBeVisible();
    await expect(
      page.getByText("Save the file and restart the development server")
    ).toBeVisible();
  });

  test("should show info box in Step 2", async ({ page }) => {
    await page.goto("/setup");

    // Navigate to Step 2
    await page.getByRole("button", { name: /Next/i }).click();

    // Check info box
    await expect(page.getByText("Why Supadata?")).toBeVisible();
    await expect(
      page.getByText("Fetches transcripts from YouTube, TikTok, Instagram")
    ).toBeVisible();
    await expect(
      page.getByText("This key is optional", { exact: false })
    ).toBeVisible();
  });

  test("should show info box in Step 3", async ({ page }) => {
    await page.goto("/setup");

    // Navigate to Step 3
    await page.getByRole("button", { name: /Next/i }).click();
    await page.getByRole("button", { name: /Skip/i }).click();

    // Check info box
    await expect(page.getByText("Why Z.AI (GLM-4.7)?")).toBeVisible();
    await expect(
      page.getByText("Primary model for summary generation")
    ).toBeVisible();
  });

  test("should show fallback model priority info in Step 4", async ({ page }) => {
    await page.goto("/setup");

    // Navigate to Step 4
    await page.getByRole("button", { name: /Next/i }).click();
    await page.getByRole("button", { name: /Skip/i }).click();
    await page.getByRole("button", { name: /Skip/i }).click();

    // Check info box
    await expect(page.getByText("Fallback Model Priority")).toBeVisible();
    // Use exact match to avoid conflict with "Google Gemini API Key" label
    await expect(page.getByText("Google Gemini", { exact: true })).toBeVisible();
    await expect(page.getByText("Groq (Llama)")).toBeVisible();
    await expect(page.getByText("OpenAI (GPT-4o-mini)")).toBeVisible();
  });

  test("should disable Test button when API key input is empty", async ({
    page,
  }) => {
    await page.goto("/setup");

    // Navigate to Step 2
    await page.getByRole("button", { name: /Next/i }).click();

    // Test button should be disabled when input is empty
    const testButton = page.getByRole("button", { name: /Test/i });
    await expect(testButton).toBeDisabled();

    // Enter a key
    await page
      .getByPlaceholder("Enter your Supadata API key")
      .fill("some-key");

    // Test button should now be enabled
    await expect(testButton).toBeEnabled();

    // Clear the input
    await page.getByPlaceholder("Enter your Supadata API key").clear();

    // Test button should be disabled again
    await expect(testButton).toBeDisabled();
  });

  test("should disable Next button in Step 2 when no API key is entered", async ({
    page,
  }) => {
    await page.goto("/setup");

    // Navigate to Step 2
    await page.getByRole("button", { name: /Next/i }).click();

    // Next button should be disabled when input is empty
    // Note: In Step 2, there's both Skip and Next. Next requires a key
    const nextButton = page.getByRole("button", { name: /^Next$/i });
    await expect(nextButton).toBeDisabled();

    // Enter a key
    await page
      .getByPlaceholder("Enter your Supadata API key")
      .fill("some-key");

    // Next button should now be enabled
    await expect(nextButton).toBeEnabled();
  });

  test("should show external links for API key providers", async ({ page }) => {
    await page.goto("/setup");

    // Step 2 - Supadata link
    await page.getByRole("button", { name: /Next/i }).click();
    const supadataLink = page.getByRole("link", { name: "supadata.ai" });
    await expect(supadataLink).toBeVisible();
    await expect(supadataLink).toHaveAttribute("href", "https://supadata.ai");
    await expect(supadataLink).toHaveAttribute("target", "_blank");

    // Step 3 - Z.AI link
    await page.getByRole("button", { name: /Skip/i }).click();
    const zaiLink = page.getByRole("link", { name: "z.ai" });
    await expect(zaiLink).toBeVisible();
    await expect(zaiLink).toHaveAttribute("href", "https://z.ai");

    // Step 4 - Multiple provider links
    await page.getByRole("button", { name: /Skip/i }).click();
    const googleLink = page.getByRole("link", { name: "Google AI Studio" });
    await expect(googleLink).toBeVisible();
    await expect(googleLink).toHaveAttribute(
      "href",
      "https://aistudio.google.com/apikey"
    );

    const groqLink = page.getByRole("link", { name: "Groq Console" });
    await expect(groqLink).toBeVisible();
    await expect(groqLink).toHaveAttribute(
      "href",
      "https://console.groq.com/keys"
    );

    const openaiLink = page.getByRole("link", { name: "OpenAI Platform" });
    await expect(openaiLink).toBeVisible();
    await expect(openaiLink).toHaveAttribute(
      "href",
      "https://platform.openai.com/api-keys"
    );
  });
});
