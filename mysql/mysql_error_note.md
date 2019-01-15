## mysql5.7.23运行sql语句报错:of ORDER BY clause is not in SELECT list, references column this is incompatible with DISTINCT  

今天在mysql5.7.23上面运行以下sql报错：
```sql
 SELECT DISTINCT
  	g.*,
  	b.usercode,
  	b.username 
  FROM
  	tbexamuserregister g
  	LEFT JOIN user b ON g.userid = b.userid
  	LEFT JOIN usergroup m ON b.USERID = m.USERID
  	LEFT JOIN group c ON m.GROUPID = c.GROUPID 
  WHERE
  	b.DELETESTATUS = 0  
  ORDER BY
  	b.CREATETIME ASC 
```
	
但是在同事的电脑上面运行却没有问题，根据报错的信息，上网查一下，原来是由于
mysql的版本导致的。在mysql5.7.x版本中，加强了sql的安全性检测，导致原来在低版本上面运行正常的sql在5.7.x版本中出现
错误。解决这个问题的方法是：在mysql的配置文件my.ini或者my.conf中，在mysqld的配置项下面，加入如下配置：
> sql_mode=NO_ENGINE_SUBSTITUTION,STRICT_TRANS_TABLES

当然，最好的解决方法，就是编写兼容性较好的sql语句，而不是通过这样的变通的方式来解决。