模型训练一次时间比较长，我们的知识时刻都在更新，模型缺乏外部知识，RAG检索增强生成，通过检索来对大模型的能力进行一个增强。

大模型能力拆解：

1.推理能力（主要靠思维链技术，用来激发）

2.知识能力（Rag用来补充知识能力）

rag主要是在用来补充推理能力、知识能力，把外部知识引入进来，推理能力主要靠思维链技术，思维链技术和RAG是大模型的两套技术。

01Rag基础架构

![图片](data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==)

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

最简单的方式就是先搞一个知识库，知识库是一个问答对，一个问题对应一个答案。对问题进行embedding向量化，把向量存在向量数据库里。比如问“饿的时候老打嗝怎么办”，会先把这个问题用同样的模型转成向量，问题的向量和知识库里问题对应的向量，进行相似度的匹配，拿到得分最高的几个答案，让大模型再总结一下，最后吐出结果，这是一个基本的rag。但只这样做的话，会存在一些召回问题，容易误召回，把很多无关的东西给拿回来，如果召回的少就会漏，到底召回多少通过这个方式不好控制。

02Rag基础架构改良

针对基础架构进行改良

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

首先有一个问答（医疗数据库、病例、对话数据等），通过段落章节拆解，用大模型把它搞成问题知识对。如果只有一段文字可以利用大模型，拿到文本文案。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

针对上述内容写出一些问答对，让大模型直接产生问答对，这样这种非结构化的数据也可以产生一个问答对的形式，进行一个向量化，并且创建索引，向量化的时候经过Bert模型。

03Bert的微调

Bert1模型是输入一个句子产生一个向量。但这个地方不能用原生Bert。

*   第一原生Bert主要是泛常识领域，缺乏对专业领域的理解。
    
*   第二原生向量不适合直接拿来召回，原生向量只能区分说是比较像。
    

a和b比较像，b和c比较像，他们得分就会比较高，如果这个向量最终是要做检索，希望相同语义相似度高，不相同语义相似度低，原生Bert不是做医疗领域的，另外它这个向量也不符合这个特点，所以就得自己微调Bert，微调之前需要采集数据。

首先knowledge里有很多种疾病，大概有700多种病(disease\_names)，同一个病对应的问题相似，不同的病对应的问题不相似。同一个病有可能分的更细，比如说肚子疼、腹泻，可能有各种各样的腹泻，可能问的问题也不一样，如果把它搞成相似有点过于粗暴了，最保险就找人一个个去写。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

先获取疾病的名称disease，把同一个病对应的内容放在一起开始遍历。比如一个病产生3000num个正样本相似对，如果小于3000个，正样本句子1是value\_list1，句子2value\_list2打乱。S1、S2相似就认为是1类，S1、S3不相似就认为是0类，其实就是做一个二分类。句子1是同一个病的，自己跟自己内部都是相似的，给打乱作为句子2，如果本身多于3000个，就随机取3000个。 

构建完正样本以后，一般来说负样本都会多于正样本，因为相似的内容趋同，但是不相似的千奇百怪。负样本一般来说更多一点，负样本先从正样本里取两倍，从数据里采样作为S1。把S1随机打乱作为S2。比如原来S1可能有十句话: 心脏病、胃疼、骨折各种病都有，随机打乱作为一个负样本，最终把这个数据存好。训练数据病情描述是第一句话，第二句话是两个不同病人问的，两个病其实没有任何关系就是0。

负样本是正样本的两倍，负样本要多于正样本，但不能多太多，模型不容易收敛，相当于说模型全都是一个类别，都是0类，那么模型训练正例太少了。一般来说样本量大于1万，负样本是正样本的2到4倍就可以。数据量越大负样本可以越多，具体是多少需要边采样边训练模型慢慢给试出来。  

04召回模型-双塔架构

训练一个**召回模型train\_recall\_model.py双塔架构**

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

架构核心要点：

*   两个独立的塔（Tower）：
    

*   Tower 1（查询侧）：处理Query/User 特征，可离线预计算
    

*   Tower 2（文档侧）：处理Document/Item 特征
    

*   共享参数（Shared Weights）：两个神经网络模型共享权重
    
*   相似度计算：通过余弦相似度计算两个向量的匹配分数（0~1）
    
*   主要优点：
    

*   查询向量可离线预计算，在线服务速度快
    

*   支持海量文档的ANN近似最近邻检索
    

*   适合推荐系统的召回阶段
    

召回模型DSSM双塔架构，两句话S1、S2经过模型model得到V1、V2，让这两个向量趋向于0或者1，相似趋向于1不相似趋向于0，**这两个模型的参数是共享的，这俩模型的参数一模一样的**，这样才能保证这两个向量在一个空间，如果这两个模型都不是一回事，那么他们的向量其实不在一个空间也不好比较。这个双塔架构就是来训练这个模型，**双塔架构**这个模型的架构效率高，每个句子对应的向量都可以离线算好，每个句子对应的向量在上线之前都可以离线算好，上线之后就直接用这两个向量进行相似度计算，而这些模型是可以离线算。它的准确率其实并没有想象中那么高，当然了也不差。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

首先加载一个Bert模型，构建双塔模型，拿子model做一个类，self Bert=Bert模型，这里的温度系数，双塔模型它进来的是两个句子X1 和X2，把这两个句子都变成向量，similar就是这两个向量的cosine值，值域是是-1到1，再经过一个sigmoid函数，给转成0~1。

```
除以 self.t温度系数的原因: 
```

\-1的时候是0.26，它最大值和最小值都到不了0和1，只能从0.26到0.73，所以除以一个0.05，这样就可以让这个数值放大一下，这样能够让它达到0和1。  

如果没有温度系数，相似度为1的时候理应收敛，但是sigmoid求出来是0.73105857863000，这个数离1还差得远，仍然会进行梯度下降导致最终模型无法收敛。这就是用温度系数的原因，**主要是为了迎合sigmoid函数。**

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

构建完模型把模型放在GPU里读一下数据，把部分参数给冻住，只要最后一层，Bert模型如下。

只训练最后一层，**把前面这些给冻住，只训练最后一层，最影响相似度的这一层，只训练这一层。**前头如果说requires\_grad=True，否则false。当然也可以少冻一点，比如最后两层都要训练，比如说一共是0 ~ 11 层， 10层、11层都要训练，**如果数据量越大，可以训练参数越多**，需要训练时间越长，效果越好，数量越大效果越好。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

所以一般来说先只训练最后一层，如果发现只训练最后一层不够用的，再训练前头的，不要一开始训练太多，先训练少点，发现了不够用，再慢慢加。

先把X1、X2进行tokenizer转成ID，0和1类，全都放在GPU里，求loss，训练每10步的时候，就把模型给保存起来。

训练模型的时候，有时候不知道训练多久，有的时候它收敛快，有的时候收敛慢。一般来说可以把这个写的相对大一点去训练，10次存一下，损失函数不再下降了就手工给停下来。

训练的是DSSM模型，保存的时候**只保存****Bert****模型，不保存DSSM**。最终需要的就是来一个句子，把它生成向量，能够把这个模型给保存下来就可以了，整个架构不需要保存太多，所以只保存bert模型，不保存dssm。

05写索引

保存完模型就要写索引，就**写索引了（insert\_knowledge.py）**，

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

首先来了一个病例knowledge，这个问题就是病情描述，获取它对应的向量，get\_vector这个函数就是把问题TOKEN化，再通过训练好的模型把向量给拿出来，做一个norma归一化。在训练的时候，计算两个向量之间的相似度用了cosine\_similarity 这个函数默认进行归一化，所以要让训练和推理保持一致进行归一化，存储向量，开始建立索引。Bert向量维度是768，声明一个faiss索引库，把索引库添进去，把训练好的向量放进索引库并保存，id\_vector.append(vector)

id\_vector对应的是一堆向量库V1 V2 V3 V4... Vn，它其实是个有序数组，对应的索引为0 1 2 3 n-1，这个向量来自于问题，通过model把它变成了一个向量。

faiss向量数据库，是专门来做向量检索用的，新来一个向量v，跟这n个哪个最接近都算一遍找相似，这样时间太长，所以把这些东西存到库里，它就会建立一个高效索引，它先找到最有可能接近的几个，简单算一下。

它会把数据向量分成几个区域，当新来个V之后，首先定位在哪个区域里，只需要跟同区域的计算相似度就可以了，这样就能够高效索引。

建完索引之后，把这个**索引保存起来，叫做id\_vector。**

06rank召回精排

(chat.py)输入症状，在这里召回，首先get\_similar\_query召回相关的query，比如query是用户问的问题，对用户输入句子使用大模型产生相似的句子，比如说“肚子疼怎么办”，通过它产生一些相似的问题。 通过提示词工程大模型改写上述这句话，随机采样，不然每次采样都一样就会丧失多样性。拿到多个query之后，对每一个query拿num=30个候选，拿候选通过faiss进行索引快速获取，这里是一个句子，拿30个候选直接用faiss\_index先转成向量，用向量直接来搜最近的30个，快速检索，搜完了以后，还有一个步骤叫做**rank**。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**双塔模型有一个很大的弊端，**两个句子S1、S2过完模型之后计算它的相似度，这两个句子在模型层面上没有信息的交互。好处是速度快，但在模型层面上它并没有进行交互，所以会再加一个精排，刚才是用召回，现在是精排，精排也是用**Bert****模型。**

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

输入两句话S1和S2，Bert前头有个CLS特殊字符，它对应的向量变成0~1，**直接用Bert做****二分类，DSM**是用Bert两个向量做相似度，而这个输入的时候，一个Bert模型直接输入两句话，用它做二分类。这两句话在模型层面上有了信息的交互，它会更准。一开始不直接用这个是因为它**没法离线算**，比如算S1的时候，不知道到底要跟哪个进行比较，理论你可以跟任何句子进行相似度比较，所以事先根本没办法离线算，所以它就慢，慢那就少算点，所以这个模型仅在召回后进行计算，得到召回后的rank得分score。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

每个句子先截取200个字符，**因为Bert最大支持512，**把两个句子进行分词，直接训练一个二分类模型，直接拿原生bert做一个二分类，把这两个句子拼接在一起来做，这就是一个**rank模型**。 

训练完模型以后，query是用户的问题，sentence候选召回的问题，拿问题跟每一个召回的构成问答对，来走rank模型得到一个分数，相当于1分就认为这两个句子非常相似，0分就认为这两个句子不相似，就走一个rank模型，把低于0.9分的都过滤掉，计算各个候选得分是因为query进行了扩写，比如今天拉肚子了怎么办，可能扩写出好几个问题，**每个问题都有可能召回到同样的东西**，因此不同的召回会有一些重复，所以就计算得分的候选。

```
┌───────────────────────┐
```

比如query通过提示词工程变成了q1 q2 q3，通过模型召回一把，比如q1召回了Q1 Q2，q2召回了Q2 Q3，q3召回了Q4 Q5，把这些召回的经过rank模型打分，Q1 1.8、Q2 0.9、Q3 0.8，取前面三个，1.8分是因为它大于1的情况被召回了多次，这就是整个一套流程。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

那么Q2被两个都给召回了，理应来说Q2它对应的内容更加符合用户的问题，所以要么召回的次数多，要么召回的得分高，所以把得分直接相加，排个序，最后取前三个得分最高的。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

次数 VS 分数

*   可以先过滤较低的分数，只对高分进行相加；
    
*   分数直接累加。 也可以自定义打分规则。
    

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

**次数和分数哪个最重要，可以**有多种组合方式取最高分，可以先过滤较低分数，只加高分，也可以都加上。也可以自定义打分规则。

向量直接进行召回容易出现一个字都不一样，但仍然召回的情况，所以**可以使用关键词贡献进行过滤**，这个主要是防止别人乱问。

召回的东西必须得有一定的文本贡献关键词，比如贡献病症，如果用户问的问题根本就没有这些词，直接把他给拒绝掉，不在解答范围之内，向量检索的好处是灵活，但也有些坏处，很有可能会出现一些极端情况，所以得通过一些关键词卡一下。

出现词相同，但意思相反，还有rank模型，它的分数会很打的很低，一样会被过滤掉。所以有rank打分模型之后，召回就可以粗放一点，因为最后还有个排序，哪怕召回错了，**通过排序模型也能把它给干掉。**  

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

比如说今天拉肚子, 调提示词，但不同的模型可能东西不太一样，需要慢慢调。

获取了前三个结果，来拼下，获取提示词，把前三个结果的治疗方案案例是病情描述，治疗方案给拼一下，就相当于把对应的三个数据给拼起来，就是以前治病的这个经验给拼起来，再走提示工程。根据上述治疗方案，给出下述病情治疗方案，然后就是问题的一个治疗方案，把这个结果给搞出来。这整个的流程**核心就在于召回和排序，再加一些提示词的工程。**

**

07总结

**

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

做数据的时候可以用一个非常大的模型比如通义千问14B，理解能力很强，但在推理的时候可以用chatglm6B。离线大、慢，效果好；在线快。

比如病例一“吃海鲜拉稀”，病例二“晚上拉稀”，病例三“都是水”，用户的问题，我吃海鲜晚上拉稀都是水，每一个都只能提供部分治疗方案，所以说必须要三个才能回答用户的问题，**要参考几个例子，将****大模型****做一个归纳和总结。**

**如果排序非常严格，那么召回的时候可以尽量多招一点回来，反正召回不靠谱的东西也通过排序干掉，排序严格，召回必须多。如果说你排序很严格，然后你召回的东西又很少，那很有可能一排序过滤没了。**

训练只有Bert两个模型，开源模型都是一些通用领域的知识，**用RAG这套系统搭建垂直领域，**用Rag来补充知识。

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

这个是Openai做的一个效果比例，原生的模型能力可能是45%的准确率，通过召回能提高65%，再通过重排rank提高85%，再用大模型归纳就能到98%。最核心的就是这三个部分。

**把rank模型和召回模型都换成原生的，效果立刻变差。**

**正样本：心脏病有N条数据**

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

负样本，随机组合。

这个数据非常好造，比如正样本心脏病有N条数据，排列组合出来，1000条数据，组合后就变成50万，负样本随机组合。

**

08扩展高级篇

**

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

这个就是一整套rag。我们可以把问答对做成一个树。比如肠胃不舒服，肚子疼，有可能是胃不舒服，也有可能是肠道不舒服，胃不舒服，可能胃酸过多，胃疼。肠胃不舒服，有可能拉稀，有可能便秘，把知识点构造成这样一个形式，召回的时候，当用户说肠胃不舒服的时候，肚子疼的时候，这四个一起出来，其实就是一种**扩展召回**，就是把知识结构做成这种结构化的数据。

但实际中很少做，因为**成本太高，**拿到项目后，不光要考虑技术实现的成本，还得考虑中间人工参与的成本，因为这个东西只能人去硬搞，成本可控、性能稳定，远强于一些特别炫酷，但是没什么用的数据。

**

09RAG VS SFT

**

![图片](<data:image/svg+xml,%3C%3Fxml version='1.0' encoding='UTF-8'%3F%3E%3Csvg width='1px' height='1px' viewBox='0 0 1 1' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Ctitle%3E%3C/title%3E%3Cg stroke='none' stroke-width='1' fill='none' fill-rule='evenodd' fill-opacity='0'%3E%3Cg transform='translate\(-249.000000, -126.000000\)' fill='%23FFFFFF'%3E%3Crect x='249' y='126' width='1' height='1'%3E%3C/rect%3E%3C/g%3E%3C/g%3E%3C/svg%3E>)

之前的各种微调技术Lora、 Pre training全量微调等，相比一下这两个技术的一些对应的关系。

首先在数据层面，**RAG技术用的是****动态数据**，每天更新都是可以的，每天建一次索引库，但SFT相对来说就是一些静态数据，它经不起每天更新，更新一次成本太高。 

rag更擅长利用外部知识，把外部知识外挂。**SFT技术它能够影响模型的文风，但文风是没有办法去控制的。rag主要是整合知识。****幻觉问题 ，rag本质不太容易产生幻觉**，直接外挂一个知识库，看着都抄错概率很低，幻觉更多的是不知道的情况下，随便猜一个。

rag好处还有透明度，各个阶段都可以debug。但用了大模型，效果不好没法查，完全黑盒， **Rag需要的数据相对来说比较小，但是它需要检索技术。SFT对数据的要求比较高，比如**100多万数据，训练 SFT其实是不够的，但是RAG技术是足够的。只要涉及到问答专业领域，问答优先选择RAG。涉及到写作风格，可以直接SFT，但这两套技术是垂直的，两个维度来切它并不矛盾。

多轮 VS 单轮（评价单轮，评价多轮）

实际场景中是单双轮混合，并且没有明显边界。

闲聊：多轮是没有问题的，但是Rag的时候，多轮需要有所考虑。

多轮：...Q1+A1 (K1)  +Q2 (K2) -> A2 

如果加了多轮，会存在上下文内容太多，导致忽略本轮问题；大模型token长度是有限的；上下文是否真的关联。

**在实际场景中是单双轮混合，并且没有明显边界。****做闲聊多轮是没有问题的，但是RAG多轮就是**把前面的问题和前面的答案和现在的问题拼在一起，这就是多轮，多轮的本质还是单轮，只不过它是把前面的问题和前面的答案放在一起了，就是所谓大模型多轮，你前面可以更长，如果用 rag，上一轮的知识召回内容加不加，**如果加了会存在前面的内容太多，前面的内容上下文太长，导致忽略了本轮的问题**，前戏太长，把关键很小的一点东西给忽略掉了，而且会出现大模型TOKEN是有限的，加一轮再前面的加不加，再前面的加不加，怎么去判断这是一个难点。 

第二**上下文是否真的关联，**比如一会问心脏病，一会用胃病，如果本身不应该进行多轮的，把它多轮了会被影响到。它本身就没有什么关系，硬把它塞在一起，反而会影响到。

做demo：提示词，demo看中上限；做生产：要求稳定，看中下限。

就是提示词这个东西慎用。**提示词最大的问题就是稳定性弱**，**demo看重上限，做生产要求稳定，看重下限**。

多轮最麻烦的是如何判断上下文是否关联，现在做法是搞个模型来判断二分类，比如问心脏病，又问肚子疼，那认为就是不关联的，如果是心脏病，又问血压就认为是关联的，搞个模型来判断，对这个地方进行自动的切。

如果上下文过长：用大模型提取摘要，用大模型提取一次摘要来解决上下文过长的问题。

大模型Rag系列文章：

[Rag是什么，Rag的整体技术架构](https://mp.weixin.qq.com/s?__biz=MzUzMjAxNDA5OQ==&mid=2247488433&idx=1&sn=fbad0756a33374c6b45e3a043c6d3b5c&scene=21#wechat_redirect)

[RAG文档解析与知识库构建](https://mp.weixin.qq.com/s?__biz=MzUzMjAxNDA5OQ==&mid=2247488441&idx=1&sn=b9ecc9847de7e51f1e5ed331cd3bc292&scene=21#wechat_redirect)

[Rag检索与排序核心算法](https://mp.weixin.qq.com/s?__biz=MzUzMjAxNDA5OQ==&mid=2247488624&idx=1&sn=3d0ffc1bd7044f341062ea5147d77148&scene=21#wechat_redirect)

[Rag中的大模型生成](https://mp.weixin.qq.com/s?__biz=MzUzMjAxNDA5OQ==&mid=2247489009&idx=1&sn=dba5c1bf1cc9155f6ec127eddd4177bf&scene=21#wechat_redirect)