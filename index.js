const express = require ('express');
const app = express ();
const cors = require ('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());



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