const express = require ('express');
const app = express ();
const cors = require ('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  // bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}




const uri = `mongodb+srv://${process.env.DB_username}:${process.env.DB_password}@cluster1.4gey7ap.mongodb.net/?retryWrites=true&w=majority`;

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
    await client.connect();
    
    const userCollection = client.db('weight-loss-academy').collection('users')
    const classCollection = client.db('weight-loss-academy').collection('classes')
    

   //JWT
   app.post('/jwt', (req, res)=>{
     const user = req.body;
     const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

     res.send({ token })
   })


   const verifyAdmin = async (req, res, next) => {
    const email = req.decoded.email;
    const query = { email: email }
    const user = await userCollection.findOne(query);
    if (user?.role !== 'admin') {
      return res.status(403).send({ error: true, message: 'forbidden message' });
    }
    next();
  }

  

    app.get('/users', verifyJWT, verifyAdmin, async (req, res)=>{
      const result = await userCollection.find().toArray()
      res.send(result)
    })

    //all user and social sign in
    app.post('/users', async(req, res)=>{
      const user = req.body;
      const query = {email: user.email};
      const exsisUser = await userCollection.findOne(query);
      if(exsisUser){
        return res.send({message: "already exsist"})
      }
      const result = await userCollection.insertOne(user);
      res.send(result)
    })

    //check admin
    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }

      const query = { email: email }
      const user = await userCollection.findOne(query);
      const result = { admin: user?.role === 'admin' }
      res.send(result);
    })

  
   


    //get admin role
    app.patch('/users/admin/:id', async (req, res)=>{
      const id =req.params.id;
      const filter = {_id : new ObjectId(id)}
      const updateDoc = {
         $set:{
           role: 'admin'
         },
      }
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result)
    })

    //get instructor
    app.patch('/users/instructor/:id', async (req, res)=>{
      const id =req.params.id;
      const filter = {_id : new ObjectId(id)}
      const updateDoc = {
         $set:{
           role: 'instructor'
         },
      }
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result)
    })


    //get class
    app.get('/allclasses', async (req, res)=>{
       const result= await classCollection.find().toArray()
       res.send(result)
    })

    //add a class
    app.post('/classes', async(req, res)=>{
       const addClass = req.body;
       const result = await classCollection.insertOne(addClass)
       res.send(result);
    })


    //admin approve class

    app.patch('/class/approve/:id', async (req, res)=>{
      const id =req.params.id;
      const filter = {_id : new ObjectId(id)}
      const updateDoc = {
         $set:{
           status: 'approve'
         },
      }
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result)
    })

    //admin denies class
    app.patch('/class/deny/:id', async (req, res)=>{
      const id =req.params.id;
      const filter = {_id : new ObjectId(id)}
      const updateDoc = {
         $set:{
           status: 'deny'
         },
      }
      const result = await classCollection.updateOne(filter, updateDoc);
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
    res.send('Weight Loss Academy is running')
})

app.listen(port, ()=>{
    console.log(`Weight Loss Academy is running ${port}`)
})