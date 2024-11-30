const express = require('express')  // Importa la librería Express, que facilita la creación de servidores HTTP en Node.js.
const app = express()  // Crea una instancia de la aplicación Express.
const cors = require('cors')  // Importa la librería CORS para habilitar el acceso desde dominios diferentes al de la aplicación.
require('dotenv').config()  // Carga las variables de entorno desde un archivo .env en el proyecto.
const mongoose = require('mongoose');  // Importa la librería Mongoose, que facilita la interacción con MongoDB.
const {Schema} = mongoose;  // Extrae el objeto Schema de Mongoose, utilizado para definir los modelos de datos.

 // Conecta a la base de datos MongoDB utilizando la URI definida en las variables de entorno (MONGO_URI).
mongoose.connect(process.env.MONGO_URI)

const UserSchema = new Schema({  // Define un esquema para el modelo de usuario.
  username: String,  // Define el campo "username" como un string.
});
const User = mongoose.model("User", UserSchema);  // Crea el modelo "User" a partir del esquema "UserSchema".


const ExerciseSchema = new Schema ({  // Define un esquema para el modelo de ejercicio.
  user_id: {type: String, required: true},  // Define el campo "user_id" como obligatorio y de tipo string.
  description: String,  // Define el campo "description" como un string.
  duration: Number,  // Define el campo "duration" como un número.
  date: Date,  // Define el campo "date" como una fecha.
});
const Exercise = mongoose.model("Exercise", ExerciseSchema);  // Crea el modelo "Exercise" a partir del esquema "ExerciseSchema".

app.use(cors())  // Habilita CORS (Cross-Origin Resource Sharing), permitiendo solicitudes desde dominios distintos.
app.use(express.static('public'))  // Sirve archivos estáticos desde el directorio 'public'.
app.use(express.urlencoded({extended: true}))  // Permite el análisis de cuerpos de solicitud con datos codificados en URL.
app.get('/', (req, res) => {  // Ruta GET para la página principal.
  res.sendFile(__dirname + '/views/index.html')  // Envía el archivo HTML 'index.html' en la carpeta 'views'.
});


app.get("/api/users", async (req, res) => {  // Ruta GET para obtener todos los usuarios.
  const users = await User.find({}).select("_id username");  // Obtiene todos los usuarios, solo con los campos '_id' y 'username'.
  if(!users){  // Si no se encontraron usuarios...
    res.send("No users");  // Responde con el mensaje "No users".
  } else {
    res.json(users);  // Si se encontraron usuarios, responde con los usuarios en formato JSON.
  }
})

app.post("/api/users", async (req, res) => {  // Ruta POST para crear un nuevo usuario.
  console.log(req.body)  // Imprime en consola los datos recibidos en el cuerpo de la solicitud.
  const userObj = new User({  // Crea una instancia del modelo "User" con los datos recibidos.
    username: req.body.username  // El "username" viene del cuerpo de la solicitud.
  })
  try{
    const user = await userObj.save()  // Guarda el nuevo usuario en la base de datos.
    console.log(user);  // Imprime el usuario creado en consola.
    res.json(user)  // Responde con el usuario creado en formato JSON.
  }catch(err){  // Si ocurre un error al guardar el usuario...
    console.log(err)  // Imprime el error en consola.
  }
})


app.post("/api/users/:_id/exercises", async (req, res) => {  // Ruta POST para crear un nuevo ejercicio para un usuario.
  const id = req.params._id;  // Obtiene el id del usuario desde los parámetros de la ruta.
  const {description, duration, date} = req.body  // Extrae los datos del ejercicio del cuerpo de la solicitud.

  try{
    const user = await User.findById(id)  // Busca al usuario con el id proporcionado.
    if(!user){  // Si el usuario no se encuentra...
      res.send("Could not find user")  // Responde con el mensaje "Could not find user".
    } else {
      const exerciseObj = new Exercise({  // Crea una nueva instancia de "Exercise" con los datos recibidos.
        user_id: user._id,  // El id del usuario se asocia al ejercicio.
        description,  // Descripción del ejercicio.
        duration,  // Duración del ejercicio.
        date: date ? new Date(date): new Date()  // Si se proporciona una fecha, se usa; de lo contrario, se utiliza la fecha actual.
      })
      const exercise = await exerciseObj.save()  // Guarda el ejercicio en la base de datos.
      res.json({  // Responde con los detalles del ejercicio guardado en formato JSON.
        _id: user._id,
        username: user.username,
        description: exercise.description,
        duration: exercise.duration,
        date: new Date(exercise.date).toDateString()  // Convierte la fecha a un formato de fecha legible.
      })
    }
  }catch(err){  // Si ocurre un error al guardar el ejercicio...
    console.log(err);  // Imprime el error en consola.
    res.send("There was an error saving the exercise")  // Responde con el mensaje de error.
  }
})


app.get("/api/users/:_id/logs", async (req, res) => {  // Ruta GET para obtener los registros de ejercicios de un usuario.
  const { from, to, limit} = req.query;  // Extrae los parámetros de consulta 'from', 'to' y 'limit'.
  const id = req.params._id;  // Obtiene el id del usuario desde los parámetros de la ruta.
  const user = await User.findById(id);  // Busca al usuario con el id proporcionado.
  if(!user){  // Si el usuario no se encuentra...
    res.send("Could not find user")  // Responde con el mensaje "Could not find user".
    return;  // Termina la ejecución de la función.
  }
  let dateObj = {}  // Crea un objeto para almacenar las condiciones de fecha.
  if(from){  // Si se proporciona un valor para 'from'...
    dateObj["$gte"] = new Date(from)  // Agrega una condición de fecha mayor o igual.
  }
  if(to){  // Si se proporciona un valor para 'to'...
    dateObj["$lte"] = new Date(to)  // Agrega una condición de fecha menor o igual.
  }
  let filter = {  // Crea un filtro para los ejercicios del usuario.
    user_id: id  // Filtra por el id del usuario.
  }
  if(from || to){  // Si se proporcionan valores para 'from' o 'to'...
    filter.date = dateObj;  // Agrega las condiciones de fecha al filtro.
  }
  const exercises = await Exercise.find(filter).limit(+limit ?? 500)  // Obtiene los ejercicios que cumplen con el filtro, limitando el número de resultados.
  const log = exercises.map(e => ({  // Mapea los ejercicios a un formato específico para el registro.
    description: e.description,
    duration: e.duration,
    date: e.date.toDateString()  // Convierte la fecha a un formato de fecha legible.
  }))
  
  res.json({  // Responde con los detalles del usuario y los registros de ejercicios.
    username: user.username,
    count: exercises.length,  // El número de ejercicios registrados.
    _id: user._id,
    log  // Los ejercicios registrados.
  })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
