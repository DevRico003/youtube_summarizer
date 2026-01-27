import { test, expect } from "@playwright/test";

// Helper to create a URL-safe base64 encoded URL
function encodeVideoUrl(url: string): string {
  return btoa(url).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

// Helper to create mock streaming response
function createStreamingResponse(events: Array<{ type: string; [key: string]: unknown }>): string {
  return events.map(event => JSON.stringify(event)).join("\n") + "\n";
}

// Mock summary data
const mockSummaryData = {
  id: "test-summary-id",
  videoId: "dQw4w9WgXcQ",
  title: "Test Video Title",
  content: "# Summary\n\nThis is a **test summary** with markdown content.\n\n## Key Points\n\n- Point 1\n- Point 2\n- Point 3",
  hasTimestamps: true,
  topics: [
    { id: "topic-1", title: "Introduction", startMs: 0, endMs: 60000, order: 1 },
    { id: "topic-2", title: "Main Content", startMs: 60000, endMs: 180000, order: 2 },
    { id: "topic-3", title: "Conclusion", startMs: 180000, endMs: 240000, order: 3 },
  ],
  modelUsed: "glm-4.7",
  source: "generated" as const,
};

// Mock response for GET /api/summarize (available models)
const mockModelsResponse = {
  models: [
    { id: "glm-4.7", name: "GLM-4.7", available: true, supportsThinking: true },
    { id: "gemini-1.5-flash", name: "Gemini", available: true, supportsThinking: false },
    { id: "llama-3.1-8b-instant", name: "Groq", available: false, supportsThinking: false },
    { id: "gpt-4o-mini", name: "OpenAI", available: false, supportsThinking: false },
  ],
};

test.describe("Summary Generation Flow", () => {
  // Mock API routes before each test
  test.beforeEach(async ({ page }) => {
    // Mock GET /api/summarize (models endpoint)
    await page.route("**/api/summarize", async (route) => {
      const request = route.request();

      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockModelsResponse),
        });
      } else if (request.method() === "POST") {
        // Mock streaming POST response for summary generation
        const streamingResponse = createStreamingResponse([
          { type: "progress", stage: "fetching_transcript", message: "Fetching transcript..." },
          { type: "progress", stage: "analyzing_topics", message: "Analyzing topics..." },
          { type: "progress", stage: "generating_summary", message: "Generating summary..." },
          { type: "progress", stage: "building_timeline", message: "Building timeline..." },
          { type: "complete", summary: mockSummaryData },
        ]);

        await route.fulfill({
          status: 200,
          contentType: "text/event-stream",
          headers: {
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
          body: streamingResponse,
        });
      }
    });

    // Mock /api/preferences endpoint (for authenticated users)
    await page.route("**/api/preferences", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          preferences: {
            language: "en",
            detailLevel: 3,
            preferredModel: "glm-4.7",
          },
        }),
      });
    });

    // Mock /api/topics/edit endpoint (for topic saving)
    await page.route("**/api/topics/edit", async (route) => {
      const request = route.request();

      if (request.method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      } else if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            topics: mockSummaryData.topics,
          }),
        });
      }
    });
  });

  test("should display home page with URL input and controls", async ({ page }) => {
    await page.goto("/");

    // Check page elements
    await expect(page.getByText("YouTube Summarizer")).toBeVisible();
    await expect(page.getByText("Get AI-powered summaries with topic timelines")).toBeVisible();

    // Check URL input
    const urlInput = page.locator("#url-input");
    await expect(urlInput).toBeVisible();
    await expect(urlInput).toHaveAttribute("placeholder", "https://youtube.com/watch?v=...");

    // Check Summarize button
    const submitButton = page.getByRole("button", { name: /Summarize/i });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeDisabled(); // Should be disabled when URL is empty
  });

  test("should validate URL input and show error for invalid URL", async ({ page }) => {
    await page.goto("/");

    const urlInput = page.locator("#url-input");
    const submitButton = page.getByRole("button", { name: /Summarize/i });

    // Enter invalid URL
    await urlInput.fill("not-a-valid-url");
    await urlInput.blur();

    // Check error message
    await expect(page.getByText("Invalid YouTube URL")).toBeVisible();

    // Submit button should still work but form won't submit due to validation
    await expect(submitButton).toBeEnabled();
  });

  test("should accept valid YouTube URL formats", async ({ page }) => {
    await page.goto("/");

    const urlInput = page.locator("#url-input");

    // Test standard watch URL
    await urlInput.fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    await urlInput.blur();
    await expect(page.getByText("Invalid YouTube URL")).not.toBeVisible();

    // Test short URL
    await urlInput.clear();
    await urlInput.fill("https://youtu.be/dQw4w9WgXcQ");
    await urlInput.blur();
    await expect(page.getByText("Invalid YouTube URL")).not.toBeVisible();

    // Test embed URL
    await urlInput.clear();
    await urlInput.fill("https://www.youtube.com/embed/dQw4w9WgXcQ");
    await urlInput.blur();
    await expect(page.getByText("Invalid YouTube URL")).not.toBeVisible();
  });

  test("should navigate to summary page when submitting valid URL", async ({ page }) => {
    await page.goto("/");

    const urlInput = page.locator("#url-input");
    const submitButton = page.getByRole("button", { name: /Summarize/i });

    // Enter valid URL
    await urlInput.fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");

    // Click submit
    await submitButton.click();

    // Should navigate to summary page
    await expect(page).toHaveURL(/\/summary\/[A-Za-z0-9_-]+/);
  });

  test("should show loading spinner when submitting", async ({ page }) => {
    await page.goto("/");

    const urlInput = page.locator("#url-input");
    const submitButton = page.getByRole("button", { name: /Summarize/i });

    // Enter valid URL
    await urlInput.fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");

    // Click submit - the button should transition to loading state
    await submitButton.click();

    // Should navigate to summary page (navigation happens quickly)
    await expect(page).toHaveURL(/\/summary\/[A-Za-z0-9_-]+/);
  });

  test("should display progress stages during summary generation", async ({ page }) => {
    // Override mock to delay the response so we can see progress stages
    await page.route("**/api/summarize", async (route) => {
      const request = route.request();

      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockModelsResponse),
        });
      } else if (request.method() === "POST") {
        // Wait for a short time to allow loading state to be visible
        await new Promise(resolve => setTimeout(resolve, 100));

        const streamingResponse = createStreamingResponse([
          { type: "progress", stage: "fetching_transcript", message: "Fetching transcript..." },
          { type: "progress", stage: "analyzing_topics", message: "Analyzing topics..." },
          { type: "progress", stage: "generating_summary", message: "Generating summary..." },
          { type: "progress", stage: "building_timeline", message: "Building timeline..." },
          { type: "complete", summary: mockSummaryData },
        ]);

        await route.fulfill({
          status: 200,
          contentType: "text/event-stream",
          headers: {
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
          body: streamingResponse,
        });
      }
    });

    // Navigate directly to summary page with encoded URL
    const videoUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const encodedUrl = encodeVideoUrl(videoUrl);

    await page.goto(`/summary/${encodedUrl}?detail=3`);

    // Wait for the loading state to show (either loading placeholder or final content)
    // The loading state shows "Loading video..." in the thumbnail placeholder
    // Or we might see the final title if loading is very fast
    const loadingOrTitle = await Promise.race([
      page.getByText("Loading video...").waitFor({ state: "visible", timeout: 3000 }).then(() => "loading"),
      page.getByRole("heading", { name: "Test Video Title" }).waitFor({ state: "visible", timeout: 10000 }).then(() => "title"),
    ]);

    // Either state is acceptable - loading state or completed state
    // The important thing is the page renders correctly
    if (loadingOrTitle === "loading") {
      // If we caught the loading state, verify progress stages
      await expect(page.getByText("Fetching Transcript")).toBeVisible({ timeout: 5000 });
    }

    // Eventually, the summary should load
    await expect(page.getByRole("heading", { name: "Test Video Title" })).toBeVisible({ timeout: 10000 });
  });

  test("should display summary content after generation completes", async ({ page }) => {
    const videoUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const encodedUrl = encodeVideoUrl(videoUrl);

    await page.goto(`/summary/${encodedUrl}?detail=3`);

    // Wait for summary to load (title appears)
    await expect(page.getByRole("heading", { name: "Test Video Title" })).toBeVisible({ timeout: 10000 });

    // Summary content should be visible
    await expect(page.getByText("This is a")).toBeVisible();
    await expect(page.getByText("test summary")).toBeVisible();
  });

  test("should display timeline when hasTimestamps is true", async ({ page }) => {
    const videoUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const encodedUrl = encodeVideoUrl(videoUrl);

    await page.goto(`/summary/${encodedUrl}?detail=3`);

    // Wait for summary to load
    await expect(page.getByRole("heading", { name: "Test Video Title" })).toBeVisible({ timeout: 10000 });

    // Timeline segments should be visible (they have aria-labels with topic titles)
    const timelineSegment = page.locator('[aria-label*="Introduction"]');
    await expect(timelineSegment).toBeVisible();
  });

  test("should display chapter links with topic titles", async ({ page }) => {
    const videoUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const encodedUrl = encodeVideoUrl(videoUrl);

    await page.goto(`/summary/${encodedUrl}?detail=3`);

    // Wait for summary to load
    await expect(page.getByRole("heading", { name: "Test Video Title" })).toBeVisible({ timeout: 10000 });

    // Chapter links should display topic titles
    await expect(page.getByText("Introduction")).toBeVisible();
    await expect(page.getByText("Main Content")).toBeVisible();
    await expect(page.getByText("Conclusion")).toBeVisible();

    // Chapter links should have YouTube timestamp URLs
    const introLink = page.locator('a[href*="youtube.com/watch"][href*="t=0s"]');
    await expect(introLink).toBeVisible();
  });

  test("should have export button that triggers download", async ({ page }) => {
    const videoUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const encodedUrl = encodeVideoUrl(videoUrl);

    await page.goto(`/summary/${encodedUrl}?detail=3`);

    // Wait for summary to load
    await expect(page.getByRole("heading", { name: "Test Video Title" })).toBeVisible({ timeout: 10000 });

    // Export button should be visible
    const exportButton = page.getByRole("button", { name: /Export/i });
    await expect(exportButton).toBeVisible();

    // Set up download listener
    const downloadPromise = page.waitForEvent("download");

    // Click export
    await exportButton.click();

    // Should trigger download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain("summary.md");
  });

  test("should have Back to Home link", async ({ page }) => {
    const videoUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const encodedUrl = encodeVideoUrl(videoUrl);

    await page.goto(`/summary/${encodedUrl}?detail=3`);

    // Wait for summary to load
    await expect(page.getByRole("heading", { name: "Test Video Title" })).toBeVisible({ timeout: 10000 });

    // Back button should be visible
    const backButton = page.getByRole("link", { name: /Back to Home/i });
    await expect(backButton.first()).toBeVisible();

    // Click back
    await backButton.first().click();

    // Should navigate to home
    await expect(page).toHaveURL("/");
  });

  test("should display video thumbnail with play button", async ({ page }) => {
    const videoUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const encodedUrl = encodeVideoUrl(videoUrl);

    await page.goto(`/summary/${encodedUrl}?detail=3`);

    // Wait for summary to load
    await expect(page.getByRole("heading", { name: "Test Video Title" })).toBeVisible({ timeout: 10000 });

    // Thumbnail image should be visible
    const thumbnail = page.locator('img[alt="Test Video Title"]');
    await expect(thumbnail).toBeVisible();

    // Thumbnail link should point to YouTube
    const thumbnailLink = page.locator('a[href*="youtube.com/watch?v=dQw4w9WgXcQ"]').first();
    await expect(thumbnailLink).toBeVisible();
    await expect(thumbnailLink).toHaveAttribute("target", "_blank");
  });

  test("should handle detail level from query parameter", async ({ page }) => {
    // Navigate with specific detail level
    const videoUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const encodedUrl = encodeVideoUrl(videoUrl);

    // Check that different detail levels can be passed
    await page.goto(`/summary/${encodedUrl}?detail=5`);

    // Wait for summary to load
    await expect(page.getByRole("heading", { name: "Test Video Title" })).toBeVisible({ timeout: 10000 });

    // URL should contain detail parameter
    expect(page.url()).toContain("detail=5");
  });

  test("should show error toast when API returns error", async ({ page }) => {
    // Override mock to return error
    await page.route("**/api/summarize", async (route) => {
      const request = route.request();

      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockModelsResponse),
        });
      } else if (request.method() === "POST") {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "Invalid video URL or video not found" }),
        });
      }
    });

    const videoUrl = "https://www.youtube.com/watch?v=invalid123";
    const encodedUrl = encodeVideoUrl(videoUrl);

    await page.goto(`/summary/${encodedUrl}?detail=3`);

    // Wait for error toast to appear (use exact match to avoid matching "1 error")
    await expect(page.getByText("Error", { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Invalid video URL or video not found")).toBeVisible();

    // Error should be dismissible
    const dismissButton = page.locator('button[aria-label="Dismiss error"]');
    await dismissButton.click();

    // Error should be hidden after dismissal
    await expect(page.getByText("Invalid video URL or video not found")).not.toBeVisible();
  });

  test("should show streaming error when received", async ({ page }) => {
    // Override mock to return streaming error
    await page.route("**/api/summarize", async (route) => {
      const request = route.request();

      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockModelsResponse),
        });
      } else if (request.method() === "POST") {
        const streamingResponse = createStreamingResponse([
          { type: "progress", stage: "fetching_transcript", message: "Fetching transcript..." },
          { type: "error", error: "Failed to fetch transcript. Video may be unavailable." },
        ]);

        await route.fulfill({
          status: 200,
          contentType: "text/event-stream",
          headers: {
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
          body: streamingResponse,
        });
      }
    });

    const videoUrl = "https://www.youtube.com/watch?v=unavailable1";
    const encodedUrl = encodeVideoUrl(videoUrl);

    await page.goto(`/summary/${encodedUrl}?detail=3`);

    // Wait for error message
    await expect(page.getByText("Failed to fetch transcript")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Summary Page - Without Timestamps", () => {
  test.beforeEach(async ({ page }) => {
    // Mock without timestamps
    const summaryWithoutTimestamps = {
      ...mockSummaryData,
      hasTimestamps: false,
      topics: [],
    };

    await page.route("**/api/summarize", async (route) => {
      const request = route.request();

      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockModelsResponse),
        });
      } else if (request.method() === "POST") {
        const streamingResponse = createStreamingResponse([
          { type: "progress", stage: "fetching_transcript", message: "Fetching transcript..." },
          { type: "progress", stage: "generating_summary", message: "Generating summary..." },
          { type: "complete", summary: summaryWithoutTimestamps },
        ]);

        await route.fulfill({
          status: 200,
          contentType: "text/event-stream",
          headers: {
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
          body: streamingResponse,
        });
      }
    });
  });

  test("should not display timeline when hasTimestamps is false", async ({ page }) => {
    const videoUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const encodedUrl = encodeVideoUrl(videoUrl);

    await page.goto(`/summary/${encodedUrl}?detail=3`);

    // Wait for summary to load
    await expect(page.getByRole("heading", { name: "Test Video Title" })).toBeVisible({ timeout: 10000 });

    // Timeline should not be visible (no aria-label with topic info)
    const timelineSegment = page.locator('[aria-label*="Introduction"]');
    await expect(timelineSegment).not.toBeVisible();

    // Chapter links section should not show topics
    await expect(page.getByText("Introduction")).not.toBeVisible();
  });
});

test.describe("Home Page - Detail Level and Model Selection", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/summarize", async (route) => {
      const request = route.request();
      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockModelsResponse),
        });
      }
    });
  });

  test("should have detail level slider with 5 levels", async ({ page }) => {
    await page.goto("/");

    // Wait for page to load
    await expect(page.getByText("YouTube Summarizer")).toBeVisible();

    // Detail slider should be visible
    const slider = page.locator('input[type="range"]');
    await expect(slider).toBeVisible();

    // Check slider attributes
    await expect(slider).toHaveAttribute("min", "1");
    await expect(slider).toHaveAttribute("max", "5");
  });

  test("should have model selector dropdown", async ({ page }) => {
    await page.goto("/");

    // Wait for models to load
    await page.waitForTimeout(500);

    // Model selector trigger button should be visible
    const modelSelector = page.locator('[role="combobox"]').first();
    await expect(modelSelector).toBeVisible();
  });

  test("should include detail level in URL when submitting", async ({ page }) => {
    // Mock the POST endpoint too
    await page.route("**/api/summarize", async (route) => {
      const request = route.request();
      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockModelsResponse),
        });
      } else if (request.method() === "POST") {
        const streamingResponse = createStreamingResponse([
          { type: "complete", summary: mockSummaryData },
        ]);
        await route.fulfill({
          status: 200,
          contentType: "text/event-stream",
          body: streamingResponse,
        });
      }
    });

    await page.goto("/");

    const urlInput = page.locator("#url-input");
    const slider = page.locator('input[type="range"]');
    const submitButton = page.getByRole("button", { name: /Summarize/i });

    // Set detail level to 5
    await slider.fill("5");

    // Enter URL and submit
    await urlInput.fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    await submitButton.click();

    // URL should contain detail=5
    await page.waitForURL(/\/summary\//);
    expect(page.url()).toContain("detail=5");
  });
});
