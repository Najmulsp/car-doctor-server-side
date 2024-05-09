const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors({
  origin:['http://localhost:5173'],
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser())

// const verifyToken = async(req, res, next) =>{
//   const token = req.cookies?.token;
//   console.log('value of token in middleware', token)
//   if(!token){
//     return res.status(401).send({message: 'not authorized'})
//   }
//   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
//     // err
//     if(err){
//       console.log(err)
//       return res.status(401).send({message: 'unauthorized'})
//     }
//     // if token is valid then it would be decoded
//     console.log('value in the token', decoded)
//     req.user = decoded;
//   })
//   next()
// }

        // verify jwt middleware
    const verifyToken = (req, res, next)=>{
      const token = req.cookies.token;
            if(token){
              jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
                if(err){
                  return err.message;
                }
                console.log(decoded)
                req.user = decoded
                next()
              })
            }
    }

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.njogpdx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster01`

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const serviceCollection = client.db('carDoctor').collection('services');
    const orderCollection = client.db('carDoctor').collection('orders');
        // auth related api
        // app.post('/jwt', async(req, res) =>{
        //     const user = req.body;
        //     console.log(user)
        //     // const token = jwt.sign(user, 'secret', {expiresIn: '1h'})
        //     const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})
        //     res
        //     .cookie('token', token, {
        //       httpOnly: true,
        //       secure: process.env.NODE_ENV === 'production', 
        //       sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        //     })
        //     .send({success: true})
        // })

        // cookie token api
        app.post('/jwt', async(req, res)=>{
          const user = req.body;
          const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '365d'});

          res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production'? 'none':'strict',
          })
          
          .send({success: true})
        })
        // clear token when logged out
        app.post('/logout', (req, res)=>{
          res.clearCookie('token',{
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production'? 'none':'strict',
            maxAge:0,
          }).send({success: true})
        })

        // service related api
        app.get('/services', async(req, res)=>{
         
            const cursor = serviceCollection.find();
            const result = await cursor.toArray();
            res.send(result)
        })
           // get single service for service details page
        app.get('/services/:id', async(req, res) =>{
            const id =req.params.id;
            const query = {_id: new ObjectId(id) }
            const result = await serviceCollection.findOne(query);
            res.send(result)
        })

           // get single service for service details page
        app.get('/orders',verifyToken,  async(req, res) =>{
            console.log(req.query.email)
            console.log('token asche', req.user)
            
            if(req.user.email !== req.query.email){
              return res.status(403).send({message: ' Access forbidden'})
            }
            let query = {}
            if(req.query?.email){
                query={email: req.query.email}
            }
            const result = await orderCollection.find(query).toArray();
            res.send(result)
        })
            // add order by create operation
        app.post('/orders', async(req, res) =>{
            const newOrder =req.body;
            
            console.log(newOrder)
            const result = await orderCollection.insertOne(newOrder);
            res.send(result)
        })

        // delete orders
        app.delete('/orders/:id', async(req, res)=>{
          const id =req.params.id;
          const query = {_id: new ObjectId(id)}
          const result = await orderCollection.deleteOne(query)
          res.send(result)
        })

        // approve orders
        app.put('/orders/:id',verifyToken, async(req, res)=>{
          const tokenData = req.user;
          console.log(tokenData, 'from token')
          const id =req.params.id;
          const query = {_id: new ObjectId(id)}
          const updateOrder ={
            $set:{
                status: updateOrder.status
            },
          }
          const result = await orderCollection.updateOne(query, updateOrder)
          res.send(result)
        })
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res)=>{
    res.send('my server is running')
})

app.listen(port, () =>{
    console.log(`car doctor is running, ${port}`)
})