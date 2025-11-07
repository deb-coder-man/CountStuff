import { useEffect, useMemo, useState, useRef } from "react";
import { Camera, Upload } from "lucide-react";
import Processing from "./Processing";

function App() {

  // API link for backend api
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  // Preprocessed Photo State
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);

  // Object URL for preview (avoid memory leaks)
  const selectedPreviewUrl = useMemo(
    () => (selectedPhoto ? URL.createObjectURL(selectedPhoto) : null),
    [selectedPhoto]
  );
  useEffect(() => {
    return () => {
      if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl);
    };
  }, [selectedPreviewUrl]);

  // Processed Photo State
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Loading State
  const [loading, setLoading] = useState<boolean>(false);

  // Count Result State
  const [countResult, setCountResult] = useState<number | null>(null);

  // Reset preview and count when a new photo is selected
  useEffect(() => {
    setPreviewPhoto(null);
    setCountResult(null);
  }, [selectedPhoto]);

  // refs for hidden inputs (camera + upload)
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedPhoto(file);
  };

  const handleOpenCamera = () => {
    // programmatically open the camera input
    cameraInputRef.current?.click();
  };

  const handleOpenUploader = () => {
    // programmatically open the file picker
    uploadInputRef.current?.click();
  };

  async function downscaleImage(file: File, maxSide = 1600): Promise<Blob> {
    const img = new Image();
    const url = URL.createObjectURL(file);
    await new Promise((res, rej) => {
      img.onload = res; img.onerror = rej; img.src = url;
    });
    const scale = Math.min(maxSide / img.width, maxSide / img.height, 1);
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(url);
    return new Promise((res) => canvas.toBlob(b => res(b!), "image/jpeg", 0.85));
}

  const handleSubmit = async (photo: File | null) => {
    if (!photo || loading) {
      if (!photo) alert("Please upload a photo before submitting.");
      return;
    }

    setLoading(true);
    setCountResult(null);

    const blob = await downscaleImage(photo, 1600);
    const formData = new FormData();
    formData.append("file", new File([blob], photo.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }));

    try {
      const response = await fetch(`${API_BASE_URL}/count`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      setCountResult(data.count ?? null);

      if (data.preview_jpeg_base64) {
        setPreviewPhoto(`data:image/jpeg;base64,${data.preview_jpeg_base64}`);
      }
    } catch (error) {
      console.error("Error uploading photo:", error);
      alert("There was an error processing your photo. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading ? (
        <Processing />
      ) : (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 relative overflow-hidden">
          {/* Hidden inputs for camera capture and upload */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoUpload}
          />
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
          />

          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, rgb(0,0,0) 1px, transparent 0)',
              backgroundSize: '48px 48px'
            }}></div>
          </div>

          {/* Main content wrapper */}
          <div className="relative z-10 flex flex-col items-center justify-start px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16 lg:py-20 pb-40 sm:pb-44 md:pb-52 lg:pb-60">
            
            {/* Header Section */}
            <div className="text-center max-w-3xl mb-10 sm:mb-12 md:mb-16 lg:mb-20">
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold mb-4 sm:mb-6 tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent animate-in fade-in duration-700">
                CountStuff
              </h1>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 font-light leading-relaxed px-4 animate-in fade-in duration-700 delay-100">
                Upload a photo or take a picture to count objects automatically.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-row items-center gap-6 sm:gap-8 md:gap-12 lg:gap-16 mb-12 sm:mb-16 md:mb-20 animate-in fade-in duration-700 delay-200">
              {/* Camera Button */}
              <button
                className="group relative p-4 sm:p-5 md:p-6 lg:p-8 rounded-2xl sm:rounded-3xl bg-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 border border-gray-200 hover:border-gray-300"
                aria-label="Open camera"
                type="button"
                onClick={handleOpenCamera}
              >
                <Camera className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 text-gray-800 group-hover:text-gray-900 transition-colors duration-300" />
              </button>

              {/* Upload Button */}
              <label
                className="group relative p-4 sm:p-5 md:p-6 lg:p-8 rounded-2xl sm:rounded-3xl bg-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer border border-gray-200 hover:border-gray-300"
                // instead of relying on the <label> directly wrapping the <input>,
                // we'll just call the opener so the visual structure stays the same
                onClick={handleOpenUploader}
              >
                {/* keep your label wrapper for visuals */}
                <Upload className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 text-gray-800 group-hover:text-gray-900 transition-colors duration-300" />
              </label>
            </div>

            {/* Image Preview Section */}
            {(selectedPreviewUrl || previewPhoto) && (
              <div className="w-full max-w-7xl px-4 mb-12 sm:mb-16 md:mb-20 animate-in fade-in duration-500">
                <div className={`grid ${selectedPreviewUrl && previewPhoto ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'} gap-8 sm:gap-10 md:gap-12 lg:gap-16`}>
                  
                  {/* Selected Photo */}
                  {selectedPreviewUrl && (
                    <div className="flex flex-col items-center gap-4 sm:gap-6">
                      <div className="relative w-full group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-gray-200 to-gray-300 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
                        <div className="relative bg-white p-2 sm:p-3 rounded-2xl sm:rounded-3xl shadow-xl">
                          <img
                            src={selectedPreviewUrl}
                            alt="Selected preview"
                            className="w-full h-auto max-h-[350px] sm:max-h-[400px] md:max-h-[500px] lg:max-h-[600px] object-contain rounded-xl sm:rounded-2xl"
                          />
                        </div>
                      </div>
                      <p className="text-sm sm:text-base md:text-lg font-medium text-gray-700">Original Image</p>
                    </div>
                  )}

                  {/* Processed Photo */}
                  {previewPhoto && (
                    <div className="flex flex-col items-center gap-4 sm:gap-6">
                      <div className="relative w-full group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-200 to-purple-300 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
                        <div className="relative bg-white p-2 sm:p-3 rounded-2xl sm:rounded-3xl shadow-xl">
                          <img
                            src={previewPhoto}
                            alt="Processed preview"
                            className="w-full h-auto max-h-[350px] sm:max-h-[400px] md:max-h-[500px] lg:max-h-[600px] object-contain rounded-xl sm:rounded-2xl"
                          />
                        </div>
                      </div>
                      <p className="text-sm sm:text-base md:text-lg font-medium text-gray-700">Processed Result</p>
                    </div>
                  )}
                </div>

                {/* Count Result */}
                {previewPhoto && countResult !== null && (
                  <div className="mt-10 sm:mt-12 md:mt-16 text-center animate-in fade-in duration-500">
                    <div className="inline-block bg-gradient-to-r from-gray-900 to-gray-800 text-white px-8 sm:px-10 md:px-12 py-4 sm:py-5 md:py-6 rounded-2xl sm:rounded-3xl shadow-2xl">
                      <p className="text-sm sm:text-base md:text-lg font-medium text-gray-300 mb-2">Count Result</p>
                      <p className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold">{countResult}</p>
                      <p className="text-xs sm:text-sm md:text-base text-gray-400 mt-2">people detected</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <div className="animate-in fade-in duration-700 delay-300">
              <button
                className="relative group px-8 sm:px-10 md:px-12 lg:px-16 py-3 sm:py-4 md:py-5 rounded-full text-base sm:text-lg md:text-xl font-semibold transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 overflow-hidden"
                style={{
                  backgroundColor: "#1A1A1A",
                  color: "#FFFFFF",
                }}
                onClick={() => handleSubmit(selectedPhoto)}
                disabled={loading || !selectedPhoto}
              >
                <span className="relative z-10">
                  {selectedPhoto ? 'Analyze Photo' : 'Upload a Photo'}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-gray-700 to-gray-900 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </div>
          </div>

          {/* Footer Decorative Images */}
          <div className="fixed bottom-0 left-0 right-0 z-0 pointer-events-none">
            <div className="mx-auto max-w-7xl px-2 sm:px-4 md:px-6 lg:px-8">
              <div className="relative h-24 sm:h-28 md:h-36 lg:h-48 xl:h-56">
                <img
                  src="/icon9.png"
                  alt="Decorative left"
                  className="absolute bottom-0 left-0 object-contain w-24 sm:w-28 md:w-36 lg:w-48 xl:w-60 opacity-90"
                />
                <img
                  src="/icon10.png"
                  alt="Decorative right"
                  className="absolute bottom-0 right-0 object-contain w-24 sm:w-28 md:w-36 lg:w-48 xl:w-60 opacity-90"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
