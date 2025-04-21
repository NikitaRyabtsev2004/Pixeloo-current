// import React, { useState, useEffect } from 'react';
// import * as tf from '@tensorflow/tfjs';
// import * as mobilenet from '@tensorflow-models/mobilenet';

// function ImageClassifier() {
//   const [image, setImage] = useState(null);
//   const [predictions, setPredictions] = useState([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [customModel, setCustomModel] = useState(null);
//   const [feedback, setFeedback] = useState(null); // 'good', 'bad' или null
//   const [selectedClass, setSelectedClass] = useState(''); // Выбранный класс при "плохо"

//   // Список классов
//   const classes = [
//     'Кот', 'Собака', 'Лиса', 'Птица', 'Рыба', 'Дракон', 'Черепаха', 'Мышь', 'Кролик', 'Енот',
//     'Динозавр', 'Медведь', 'Волк', 'Змея', 'Сова', 'Гриб', 'Цветок', 'Дерево', 'Кактус', 'Облако',
//     'Звезда', 'Луна', 'Солнце', 'Меч', 'Щит', 'Кирка', 'Зелье', 'Сундук', 'Монета', 'Кристалл',
//     'Факел', 'Книга', 'Письмо', 'Игровой джойстик', 'Ретро-компьютер', 'Телевизор', 'Телефон', 'Робот',
//     'Привидение', 'Тыква', 'Череп', 'Глаз', 'Сердце', 'Еда (пицца, гамбургер, суши)', 'Напиток (кофе, чай, кола)',
//     'Маленький домик', 'Замок', 'Космический корабль', 'Ракета', 'Пиксельный человечек', 'Ниндзя', 'Рыцарь',
//     'Волшебник', 'Драгоценный камень', 'Стрелка', 'Нож', 'Топор', 'Посох', 'Перо', 'Лампа', 'Фонарь', 'Часы',
//     'Бумага', 'Маска', 'Бомба', 'Свиток', 'Арбалет', 'Ключ', 'Корона', 'Плащ', 'Ботинок', 'Скелет', 'Статуя',
//     'Флаг', 'Корабль', 'Маяк', 'Мост', 'Фонтан', 'Колодец', 'Железная дорога', 'Поезд', 'Машина', 'Велосипед',
//     'Вертолет', 'Самолет', 'Воздушный шар', 'Спутник', 'Инопланетянин', 'Портал', 'Пузырь', 'Льдинка', 'Снеговик',
//     'Костер', 'Дым', 'Радуга', 'Электрическая лампочка', 'Батарейка', 'Вилка', 'Розетка', 'Музыкальный инструмент (гитара, пианино, барабан)',
//     'Микрофон', 'Радиоприемник', 'Магнитофон', 'Кассета', 'CD-диск', 'Книга заклинаний', 'Ковер', 'Подушка', 'Стул',
//     'Стол', 'Шкаф', 'Телевизионная антенна'
//   ];

//   // Загрузка модели при старте
//   useEffect(() => {
//     const loadModel = async () => {
//       try {
//         const model = await tf.loadLayersModel('localstorage://pixel-art-model/model.json');
//         setCustomModel(model);
//       } catch (error) {
//         console.log('Модель не найдена, будет создана новая');
//         createModel();
//       }
//     };
//     loadModel();
//   }, []);

//   // Создание новой модели
//   const createModel = async () => {
//     // Загружаем MobileNet как LayersModel с TensorFlow Hub
//     const baseModel = await tf.loadLayersModel(
//       'https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v2_100_224/feature_vector/3/default/1',
//       { fromTFHub: true }
//     );
  
//     // Замораживаем первый слой (или другие, по необходимости)
//     baseModel.layers[0].trainable = false;
  
//     // Создаем новую модель поверх базовой
//     const model = tf.sequential();
//     model.add(baseModel);
//     model.add(tf.layers.flatten());
//     model.add(tf.layers.dense({ units: 128, activation: 'relu' }));
//     model.add(tf.layers.dense({ units: classes.length, activation: 'softmax' }));
  
//     // Компилируем модель
//     model.compile({
//       optimizer: 'adam',
//       loss: 'categoricalCrossentropy',
//       metrics: ['accuracy']
//     });
  
//     // Сохраняем модель (например, в состояние)
//     setCustomModel(model);
//   };

//   // Обработка загруженного изображения
//   const handleImageUpload = async (event) => {
//     const file = event.target.files[0];
//     if (!file) return;

//     setIsLoading(true);
//     const img = await fileToImage(file);
//     setImage(img);
//     predict(img);
//   };

//   // Преобразование файла в объект Image
//   const fileToImage = (file) => {
//     return new Promise((resolve) => {
//       const reader = new FileReader();
//       reader.onload = (e) => {
//         const img = new Image();
//         img.src = e.target.result;
//         img.onload = () => resolve(img);
//       };
//       reader.readAsDataURL(file);
//     });
//   };

//   // Преобразование изображения в тензор
//   const imageToTensor = (img) => {
//     return tf.tidy(() => {
//       const tensor = tf.browser.fromPixels(img).resizeNearestNeighbor([224, 224]);
//       return tensor.toFloat().div(tf.scalar(127.5)).sub(tf.scalar(1)).expandDims();
//     });
//   };

//   // Предсказание с помощью модели
//   const predict = async (img) => {
//     try {
//       const tensor = imageToTensor(img);
//       const predTensor = customModel.predict(tensor);
//       const predArray = await predTensor.data();
//       const predictions = Array.from(predArray)
//         .map((prob, i) => ({
//           className: classes[i],
//           probability: prob
//         }))
//         .sort((a, b) => b.probability - a.probability)
//         .slice(0, 5);
//       setPredictions(predictions);
//     } catch (error) {
//       console.error('Ошибка при предсказании:', error);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // Обработка обратной связи
//   const handleFeedback = async (isGood) => {
//     if (!image || !predictions.length) return;

//     setFeedback(isGood ? 'good' : 'bad');
//     if (isGood) {
//       await trainModel(true);
//     }
//   };

//   // Дообучение модели
//   const trainModel = async (isGood) => {
//     setIsLoading(true);
//     try {
//       const tensor = imageToTensor(image);
//       let label;

//       if (isGood) {
//         // Если "хорошо", берем топ-1 предсказание как правильный класс
//         const topPrediction = predictions[0].className;
//         const labelIndex = classes.indexOf(topPrediction);
//         label = tf.oneHot(labelIndex, classes.length).expandDims();
//       } else {
//         // Если "плохо", используем выбранный пользователем класс
//         const labelIndex = classes.indexOf(selectedClass);
//         if (labelIndex === -1) {
//           alert('Выберите правильный класс!');
//           setIsLoading(false);
//           return;
//         }
//         label = tf.oneHot(labelIndex, classes.length).expandDims();
//       }

//       // Дообучение модели
//       await customModel.fit(tensor, label, {
//         epochs: 1,
//         batchSize: 1
//       });

//       // Сохранение модели в локальное хранилище
//       await customModel.save('localstorage://pixel-art-model');
//       console.log('Модель обновлена и сохранена!');

//       // Повторное предсказание
//       predict(image);
//     } catch (error) {
//       console.error('Ошибка при дообучении:', error);
//     } finally {
//       setIsLoading(false);
//       setFeedback(null);
//       setSelectedClass('');
//     }
//   };

//   return (
//     <div style={{ padding: '20px', fontFamily: 'Arial' }}>
//       <h1>Распознавание пиксель-артов</h1>

//       {/* Загрузка изображения */}
//       <input
//         type="file"
//         accept="image/*"
//         onChange={handleImageUpload}
//         disabled={isLoading}
//       />

//       {/* Отображение изображения */}
//       {image && (
//         <div style={{ marginTop: '20px' }}>
//           <h3>Загруженное изображение:</h3>
//           <img
//             src={image.src}
//             alt="Uploaded Pixel Art"
//             style={{ maxWidth: '300px', border: '1px solid #ccc' }}
//           />
//         </div>
//       )}

//       {/* Отображение результатов */}
//       {isLoading ? (
//         <p>Обработка изображения...</p>
//       ) : (
//         predictions.length > 0 && (
//           <div style={{ marginTop: '20px' }}>
//             <h3>Топ-5 совпадений:</h3>
//             <ul style={{ listStyleType: 'none', padding: 0 }}>
//               {predictions.map((pred, index) => (
//                 <li key={index} style={{ margin: '5px 0' }}>
//                   {pred.className}: <strong>{Math.round(pred.probability * 100)}%</strong>
//                 </li>
//               ))}
//             </ul>

//             {/* Кнопки обратной связи */}
//             <button
//               onClick={() => handleFeedback(true)}
//               disabled={feedback !== null}
//             >
//               Хорошо
//             </button>
//             <button
//               onClick={() => handleFeedback(false)}
//               disabled={feedback !== null}
//               style={{ marginLeft: '10px' }}
//             >
//               Плохо
//             </button>

//             {/* Выбор класса при "плохо" */}
//             {feedback === 'bad' && (
//               <div style={{ marginTop: '10px' }}>
//                 <label>Выберите правильный класс: </label>
//                 <select
//                   value={selectedClass}
//                   onChange={(e) => setSelectedClass(e.target.value)}
//                 >
//                   <option value="">-- Выберите класс --</option>
//                   {classes.map((cls) => (
//                     <option key={cls} value={cls}>
//                       {cls}
//                     </option>
//                   ))}
//                 </select>
//                 <button
//                   onClick={() => trainModel(false)}
//                   style={{ marginLeft: '10px' }}
//                 >
//                   Подтвердить
//                 </button>
//               </div>
//             )}
//           </div>
//         )
//       )}
//     </div>
//   );
// }

// export default ImageClassifier;