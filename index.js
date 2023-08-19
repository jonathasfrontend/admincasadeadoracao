const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios');
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');


const User = require('./models/User');
const Noticias = require('./models/noticias');

const jwtSecret = 'casadeadoracao.midia.net.br@Jonathas';

const app = express();

require('dotenv').config();
app.use(cookieParser());
app.use( bodyParser.json() );
app.use(bodyParser.urlencoded({extended: true})); 
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.use('/public', express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, '/pages'));

/**
 * 
 * Check Login
*/
const authMiddleware = (req, res, next ) => {
  const token = req.cookies.token;
  if(!token) {
    return res.redirect('/')
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.userId = decoded.userId;
    next();
  } catch(error) {
    res.redirect('/')
  }
}



app.get('/', async  (req, res) => {
  res.render('login')
})
app.post('/', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      return res.send('Usuario invalido')
    }
    if (user.password !== password) {
      return res.send('Senha invalida')
    }

    const cookieOptions = {
      httpOnly: true,
      maxAge: 60 * 60 * 1000, // 1 hora
    };

    const token = jwt.sign({ userId: user._id }, jwtSecret);
    res.cookie('token', token, cookieOptions);
    res.redirect('/oracoes');

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// app.post('/', async (req, res) => {
//   try {
//     const { username, password } = req.body;
//     try {
//       User.create({ username, password });
//       res.redirect('/')
//     } catch (error) {
//       console.log(error)
//     }
//   } catch (error) {
//     console.log(error);
//   }
// });

app.get('/oracoes', authMiddleware, async  (req, res) => {
  const oracoes = await axios.get(process.env.URL_PEDIDOS_GET_MONGODB);
  const listoracoes = oracoes.data.map(val => ({
      id: val._id,
      name: val.name,
      telefone: val.telefone,
      pedido: val.pedido,
      createdAt: val.createdAt,
  }));
  listoracoes.reverse();
  res.render('oracoes', {listoracoes})
})
app.get('/blog', authMiddleware, async (req, res) => {
  const noticia = await axios.get(process.env.URL_NOTICIA_GET_MONGO);
  const post = noticia.data.map(val => ({
      id: val._id,
      title: val.title,
      body: val.body,
      category: val.category,
      createdAt: val.createdAt,
      autor: val.autor
  }));

  post.reverse();
  const contagem = post.length;
  const nLimit = post.slice(0, 8);
  res.render('blog', {nLimit, contagem});
})
app.post('/blog', authMiddleware,async (req, res) => {
  const data = {
      title: req.body.title,
      body: req.body.assunto,
      category: req.body.category,
      autor: req.body.autor,
    };
    await axios.post(process.env.URL_ADD_NOTICIA_POST_MONGO, data);
    res.redirect('/blog')
})
app.get('/blog-delet/:id', authMiddleware, async (req, res) => {
  try {
    await Noticias.deleteOne({ _id: req.params.id });
    res.redirect('/blog')
  } catch (error) {
    console.log(error)
  }
});
app.get('/blog-update/:id', authMiddleware, async (req, res) => {
  const noticia = await axios.get(process.env.URL_NOTICIA_GET_MONGO);
  const post = noticia.data.map(val => ({
      id: val._id,
      title: val.title,
      body: val.body,
      createdAt: val.createdAt,
      autor: val.autor
  }));

  const contagem = post.length;

  post.reverse();
  const nLimit = post.slice(0, 8);
  const data = await Noticias.findOne({ _id: req.params.id });

  res.render('update', {data, contagem, nLimit})

});
app.post('/blog-update/:id', authMiddleware, async (req, res) => {
  try {
    const { title, body } = req.body;
    await Noticias.findByIdAndUpdate(req.params.id, {
      title,
      body 
    });

    res.redirect(`/blog-update/${req.params.id}`);

  } catch (error) {
    console.log(error);
  }

});
app.get('/sair', authMiddleware, async (req, res) => {
  try {
  const cookieName = 'token';
  const cookieOptions = {
    httpOnly: true,
    maxAge: 0,
  };
  res.cookie(cookieName, '', cookieOptions);
  res.redirect('/');
  } catch (error) {
    console.log(error)
  }
});
app.get('/cursodemembresia', authMiddleware, async (req, res) => {
  const cursodemembresia = await axios.get(process.env.URL_ADD_CDM_GET_MONGO);
  const usersCursodemembresia = cursodemembresia.data.map(val => ({
      id: val._id,
      nome: val.nome,
      nascimento: val.nascimento,
      telefone: val.telefone,
      estadocivil: val.estadocivil,
      naturalde: val.naturalde,
      endereco: val.endereco,
      createdAt: val.createdAt,
  }));

  res.render('cursodemembresia', {usersCursodemembresia})
})

app.use(function(req, res, next) {
  res.status(404).render('404');
});

mongoose.connect('mongodb+srv://root:Jonathas001@cluster0.vmkcvsj.mongodb.net/?retryWrites=true&w=majority')
.then(()=>{console.log("bd connected")})
.catch(()=>{console.log("Falha ao conectar com o banco")})

app.listen(process.env.PORT || 4000,()=>{
  console.log('server rodando na porta 4000');
})
