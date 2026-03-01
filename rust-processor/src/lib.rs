use wasm_bindgen::prelude::*;
use image::{
    DynamicImage, ImageFormat, ImageReader,
    imageops::FilterType,
};
use std::io::Cursor;

/// Resize an image to the given dimensions and encode to the specified format.
///
/// Arguments:
/// - `input_bytes`: raw bytes of the source image
/// - `target_width`: desired width in pixels
/// - `target_height`: desired height in pixels
/// - `format`: output format — "jpeg", "png", or "webp"
/// - `quality`: JPEG/WebP quality 1-100 (ignored for PNG)
///
/// Returns encoded bytes of the resized image.
#[wasm_bindgen]
pub fn resize_image(
    input_bytes: &[u8],
    target_width: u32,
    target_height: u32,
    format: &str,
    quality: u8,
    filter_name: &str,
) -> Result<Vec<u8>, JsValue> {
    let img = load_image(input_bytes)?;

    let filter = parse_filter(filter_name);
    let resized = img.resize_exact(target_width, target_height, filter);

    // If upscaling (making the image physically larger in pixels), apply an Unsharp Mask 
    // to algorithmically enhance edge contrast and perceivable clarity.
    let enhanced = if target_width > img.width() || target_height > img.height() {
        // Parameters: sigma (blur radius), threshold (pixel diff cutoff)
        resized.unsharpen(2.5, 30) // Aggressive sharpening
    } else {
        resized
    };

    encode_image(&enhanced, format, quality)
}

/// Get the dimensions (width, height) of an image from its bytes.
/// Returns [width, height] as a Vec<u32>.
#[wasm_bindgen]
pub fn get_dimensions(input_bytes: &[u8]) -> Result<Vec<u32>, JsValue> {
    let img = load_image(input_bytes)?;
    Ok(vec![img.width(), img.height()])
}

/// Encode an image at a specific quality without resizing.
/// Useful for the binary search on quality to hit a target file size.
#[wasm_bindgen]
pub fn encode_at_quality(
    input_bytes: &[u8],
    width: u32,
    height: u32,
    format: &str,
    quality: u8,
    filter_name: &str,
) -> Result<Vec<u8>, JsValue> {
    let img = load_image(input_bytes)?;
    let filter = parse_filter(filter_name);
    let resized = img.resize_exact(width, height, filter);
    encode_image(&resized, format, quality)
}

// --- Internal helpers ---

fn parse_filter(name: &str) -> FilterType {
    match name {
        "catmullrom" => FilterType::CatmullRom,
        "triangle" => FilterType::Triangle,
        "nearest" => FilterType::Nearest,
        "gaussian" => FilterType::Gaussian,
        "lanczos3" | _ => FilterType::Lanczos3,
    }
}

fn load_image(bytes: &[u8]) -> Result<DynamicImage, JsValue> {
    let reader = ImageReader::new(Cursor::new(bytes))
        .with_guessed_format()
        .map_err(|e| JsValue::from_str(&format!("Failed to guess format: {}", e)))?;

    reader
        .decode()
        .map_err(|e| JsValue::from_str(&format!("Failed to decode image: {}", e)))
}

fn encode_image(img: &DynamicImage, format: &str, quality: u8) -> Result<Vec<u8>, JsValue> {
    let mut buf = Vec::new();
    let mut cursor = Cursor::new(&mut buf);

    match format {
        "jpeg" | "jpg" => {
            let encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(
                &mut cursor,
                quality,
            );
            img.write_with_encoder(encoder)
                .map_err(|e| JsValue::from_str(&format!("JPEG encode failed: {}", e)))?;
        }
        "png" => {
            img.write_to(&mut cursor, ImageFormat::Png)
                .map_err(|e| JsValue::from_str(&format!("PNG encode failed: {}", e)))?;
        }
        "webp" => {
            // image 0.25.x WebP encoder — use write_to for simplicity
            img.write_to(&mut cursor, ImageFormat::WebP)
                .map_err(|e| JsValue::from_str(&format!("WebP encode failed: {}", e)))?;
        }
        _ => {
            return Err(JsValue::from_str(&format!("Unsupported format: {}", format)));
        }
    }

    Ok(buf)
}
