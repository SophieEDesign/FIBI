# Meta oEmbed Read – Resubmission After Rejection

Use this when resubmitting after: **"Unable to Verify oEmbed Use Case Experience in App"** (Developer Policy 1.6).

---

## 1. Single URL for reviewers (recommended)

Give Meta **one URL** that:

- Opens **your site** (FiBi) with the oEmbed feature visible  
- Shows **Meta-owned content** (Instagram or Facebook) being used via oEmbed  

**Format:**

```
https://fibi.world/oembed-test?url=<ENCODED_INSTAGRAM_OR_FACEBOOK_URL>
```

**You must use a real, public post from your official Instagram or Facebook page.**

### Example (replace with your real post)

- Your Instagram post: `https://www.instagram.com/p/ABC123YOUR_REAL_POST_ID/`
- Encoded for the query: `https%3A%2F%2Fwww.instagram.com%2Fp%2FABC123YOUR_REAL_POST_ID%2F`
- **URL to provide to Meta:**

```
https://fibi.world/oembed-test?url=https%3A%2F%2Fwww.instagram.com%2Fp%2FABC123YOUR_REAL_POST_ID%2F
```

Replace `ABC123YOUR_REAL_POST_ID` with the real shortcode from a public post on your official Instagram (or use a public Facebook post URL and encode it the same way).

When a reviewer opens that link they will see:

1. FiBi’s oEmbed test page  
2. The Instagram (or Facebook) URL pre-filled and the oEmbed request run automatically  
3. The oEmbed response (JSON) and how the preview is shown in the app  

---

## 2. If you prefer a direct API URL

You can also give the raw oEmbed endpoint with a **real** Instagram or Facebook URL:

```
https://fibi.world/api/oembed?url=https%3A%2F%2Fwww.instagram.com%2Fp%2FYOUR_POST_ID%2F&format=json
```

Again, use a real public post from your official page. The response will be JSON (possibly with empty fields until Meta approves the app).

---

## 3. Reviewer instructions to paste into App Review

Copy the following into the **Web reviewer instructions** (or notes) when you resubmit.

---

### How to verify FiBi’s oEmbed use case

**Single test URL (recommended)**  
Open this URL in your browser (replace the Instagram part with a real public post from our official Instagram if we’ve provided a different link):

**https://fibi.world/oembed-test?url=https%3A%2F%2Fwww.instagram.com%2Fp%2F\[POST_ID\]%2F**

You should see:

1. **FiBi’s website** – the oEmbed test page at fibi.world  
2. **The oEmbed feature** – an input with the Instagram (or Facebook) URL and a “Test” button  
3. **Meta-owned content** – the same Instagram/Facebook URL displayed via our oEmbed integration (preview and/or JSON response)

No login is required for this page.

**Optional – direct API check**  
To verify the oEmbed endpoint directly:

- **https://fibi.world/api/oembed?url=**`<any_public_instagram_or_facebook_post_url>`**&format=json**

You should get a JSON response (HTTP 200). Until our app is approved, some fields may be empty; the endpoint itself must return 200 and valid JSON.

**If you see 401 Unauthorized**  
Our host (Vercel) may be showing a login prompt. If that happens:

- Try opening the URL in an incognito/private window, or  
- Contact us so we can add an exception for Meta’s reviewer access.

We have verified the URL in the [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) (or we will do so before resubmission).

---

## 4. Before you resubmit

- [ ] **Use a real Meta URL**  
  Use a public post from your **official** Instagram or Facebook page in the `url=` parameter (no placeholder like `ABC123xyz` or `Cx123456789`).

- [ ] **Test the exact URL**  
  In a browser, open the full URL you will send to Meta (e.g. `https://fibi.world/oembed-test?url=...`). Confirm you see the test page and the oEmbed result (or a clear message), with **no** login wall or error page.

- [ ] **Avoid 401 on production**  
  If fibi.world is behind Vercel Deployment Protection, reviewers will get 401. Either add an exception for the production domain (or for Meta’s access) or temporarily disable protection for production so reviewers can open the link. See `docs/VERCEL_PREVIEW_401.md`.

- [ ] **Optional: Facebook Sharing Debugger**  
  Paste `https://fibi.world/oembed-test` (and, if you like, the full `?url=...` URL) into [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) and fix any errors it reports so Meta’s systems can fetch the page.

---

## 5. Summary for the resubmission form

- **Updated URL:**  
  `https://fibi.world/oembed-test?url=<encoded_public_instagram_or_facebook_post_url>`

- **What reviewers will see:**  
  FiBi’s oEmbed test page, with the oEmbed feature and the Meta (Instagram/Facebook) content loaded via that feature.

- **If 401 appears:**  
  Explain that Vercel Deployment Protection may be blocking access and that you have added (or will add) an exception so Meta reviewers can access the URL, or that you have verified the URL in the Facebook Sharing Debugger.
