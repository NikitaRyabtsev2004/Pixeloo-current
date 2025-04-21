import React from 'react';

const ImageUploader = React.memo(({ onImageUpload }) => {
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          onImageUpload(e.target.result);
        };
        reader.readAsDataURL(file);
      } else {
        alert('Пожалуйста, выберите файл изображения.');
      }
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        id="image-upload"
        style={{ display: 'none' }}
      />
      <label htmlFor="image-upload" className="image-upload__container">
        Создать трафарет
      </label>
    </div>
  );
});

export default ImageUploader;
