import type { Metadata } from "next";
import Link from "next/link";
import { InstagramResizerTool } from "@/components/tools/instagram-resizer-tool";
import { PrivacyNote, ToolPageShell } from "@/components/tool-page/tool-page-shell";
import { INSTAGRAM_PRESETS } from "@/lib/presets/instagram";
import { pageMetadata } from "@/lib/seo/metadata";
import type { FaqItem } from "@/lib/seo/schema";
import { getTool } from "@/lib/tools/registry";

const tool = getTool("instagram-image-resizer");

const description =
  "Resize images for Instagram posts, Stories and Reels for free. Choose the right dimensions, crop or fit your image, preview the result and download it.";

export const metadata: Metadata = pageMetadata({
  title: "Instagram Image Resizer Online Free",
  description,
  path: tool.path,
});

const faqs: FaqItem[] = [
  {
    question: "How do I resize an image for Instagram?",
    answer:
      "Add your photo, pick the format you're posting (square, portrait, landscape, Story or Reel cover), then either drag the crop box to choose what to keep or switch to Fit to keep the whole photo. Select Create Instagram image, check the preview and download the file, then upload it to Instagram as usual.",
  },
  {
    question: "What is the best size for an Instagram post?",
    answer:
      "For most photos, a 1080 × 1350 px portrait (4:5) is the best choice because it fills more of the screen in the feed than a square. Use 1080 × 1080 px when the picture is naturally square or you want a uniform grid, and 1080 × 566 px for wide landscape shots.",
  },
  {
    question: "What size should an Instagram Story be?",
    answer:
      "1080 × 1920 pixels, a 9:16 vertical frame that fills a phone screen. Instagram's profile name and reply bar sit over the top and bottom of a Story, so the Story preset shows a guide to keep text and faces in the middle area.",
  },
  {
    question: "What dimensions should I use for a Reel cover?",
    answer:
      "Make the cover 1080 × 1920 pixels to match the 9:16 Reel. Your profile grid shows only a cropped middle part of it, currently a 3:4 area, so keep the title and the main subject inside the guide the Reel cover preset shows.",
  },
  {
    question: "Can I resize an Instagram image without cropping it?",
    answer:
      "Yes. Choose Fit whole photo: the entire picture is scaled into the frame and the space around it is filled with white, black, a colour you choose or a blurred copy of the photo. You can move the photo within the frame and add an even border.",
  },
  {
    question: "How do I resize a photo to 1080 × 1080?",
    answer:
      "Select the Square post preset. If your photo isn't square, drag the crop box to choose the square you want to keep, or switch to Fit to place the whole photo on a square background. The download is exactly 1080 × 1080 pixels.",
  },
  {
    question: "Will resizing reduce image quality?",
    answer:
      "Scaling a large phone photo down to 1080 px wide keeps it sharp. Quality suffers when a small image or a small crop is enlarged, and the tool warns you when that happens. Save as JPG at around 90% quality so Instagram's own compression has good material to work from.",
  },
  {
    question: "Are my images uploaded to a server?",
    answer:
      "No. Cropping, resizing and saving all happen in your web browser on your own device. Your photo isn't sent to Imgifyr or anyone else, and nothing is kept after you close the page.",
  },
  {
    question: "Can I resize images for Instagram for free?",
    answer:
      "Yes. The tool is free with no account, no limit on how many images you resize and no watermark on the result.",
  },
];

export default function InstagramImageResizerPage() {
  return (
    <ToolPageShell
      tool={tool}
      h1="Instagram Image Resizer"
      intro={
        <p>
          Resize and crop photos to the right size for Instagram posts, Stories and Reel covers, or fit the whole photo
          into the frame without cropping. Preview the result and download an image at the exact dimensions, made right in
          your browser.
        </p>
      }
      schemaDescription={description}
      faqs={faqs}
      content={
        <>
          <h2>How to resize an image for Instagram</h2>
          <ol>
            <li>Choose, drop or paste a photo. JPG, PNG, WebP and iPhone HEIC photos all work.</li>
            <li>Pick the Instagram size: a feed post shape, a Story or a Reel cover. Each shows its pixel size and ratio.</li>
            <li>
              Decide what happens when the shapes differ. <strong>Crop to fill</strong> lets you drag the frame to the part
              you want; <strong>Fit whole photo</strong> keeps everything and adds a background.
            </li>
            <li>Choose JPG, PNG or WebP and the quality, then select <strong>Create Instagram image</strong>.</li>
            <li>Compare the original and the result, including the new dimensions and file size, and download.</li>
          </ol>

          <h2>Choosing the right Instagram size</h2>
          <h3>Feed posts</h3>
          <p>
            Feed posts can be square, portrait or landscape. A <strong>4:5 portrait</strong> (1080 × 1350) is usually the best
            pick for photos of people, products and food, because it takes up the most room as people scroll. Use the{" "}
            <strong>square</strong> preset when a consistent grid matters, and <strong>landscape</strong> for scenery and group
            shots. The <strong>3:4</strong> preset matches the taller previews on profile grids, but older apps and some
            publishing tools may still trim it to 4:5, so check it after posting.
          </p>
          <h3>Stories and Reels</h3>
          <p>
            Stories and Reels fill the screen with a 9:16 vertical frame of 1080 × 1920. They follow different rules from feed
            posts: buttons, captions and your profile name are drawn over the picture, and a Reel cover appears in your
            profile grid as a cropped middle section. Turn on the guide to see which areas to keep clear.
          </p>

          <h2>Instagram image size reference</h2>
          <table>
            <thead>
              <tr>
                <th scope="col">Format</th>
                <th scope="col">Size in pixels</th>
                <th scope="col">Aspect ratio</th>
                <th scope="col">Good for</th>
              </tr>
            </thead>
            <tbody>
              {INSTAGRAM_PRESETS.map((preset) => (
                <tr key={preset.id}>
                  <td>{preset.label}</td>
                  <td>
                    {preset.width} × {preset.height}
                  </td>
                  <td>{preset.ratio}</td>
                  <td>{preset.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            These are the sizes most creators use. Instagram re-compresses every upload and can change how it displays each
            format, so treat them as reliable starting points rather than fixed rules. Feed images wider than 1080 pixels are
            scaled down when posted, so there is little benefit in uploading larger files.
          </p>

          <h2>Crop or fit: which should you use?</h2>
          <p>
            <strong>Cropping</strong> fills the whole frame with your photo and cuts off whatever falls outside it. It looks
            cleanest in the feed, and you choose exactly which part stays by dragging the frame, zooming with a pinch or Ctrl +
            scroll, or using the arrow keys.
          </p>
          <p>
            <strong>Fitting</strong> keeps every pixel of the photo and fills the empty space instead. A white or black
            background gives a gallery look, a blurred copy of the photo looks seamless, and a border adds the same margin on
            every side. Use it to resize a photo for Instagram without cropping a panorama, a screenshot or a group shot where
            no one should be cut out. The image is never stretched in either mode.
          </p>

          <h2>Tips for sharp results and no surprise cropping</h2>
          <ul>
            <li>Start from the original photo, not a screenshot or a copy saved from a messaging app, which are often reduced.</li>
            <li>
              If the tool says your photo will be enlarged, choose a larger crop area or a higher-resolution original. A
              blurry-looking upload is usually an enlarged one.
            </li>
            <li>Keep text and faces away from the edges of Stories and inside the grid area of Reel covers.</li>
            <li>
              Save as JPG at around 90% quality. If you need a smaller file afterwards, the{" "}
              <Link href="/tools/image-compressor">image compressor</Link> shrinks it without changing the dimensions.
            </li>
            <li>
              Got an iPhone photo in HEIC format, or a WebP saved from a website? They open here directly, or you can convert
              them first with <Link href="/tools/heic-to-jpg">HEIC to JPG</Link> and{" "}
              <Link href="/tools/webp-to-jpg">WebP to JPG</Link>.
            </li>
          </ul>

          <h2>Other sizes and formats</h2>
          <p>
            For any other dimensions, use the general <Link href="/tools/image-resizer">image resizer</Link>, which resizes by
            pixels or percentage. To crop freely or to ratios such as 16:9 for other sites, use the{" "}
            <Link href="/tools/image-cropper">image cropper</Link>. Need a lossless copy for editing or a transparent
            background? <Link href="/tools/jpg-to-png">Convert JPG to PNG</Link>.
          </p>

          <PrivacyNote>
            <p>
              Your photo is decoded, cropped or fitted, and saved by your own browser, usually in a background thread so the
              page stays responsive. It is never uploaded, and no copy is stored once you close the page.
            </p>
          </PrivacyNote>
        </>
      }
    >
      <InstagramResizerTool />
    </ToolPageShell>
  );
}
