import requests
import time as t
url = 'https://kisargo.ml/api'
payload = 	{
		"address" : "#623, 10TH A MAIN NE, MAIN BUS STOP" ,
		"age" : "12" ,
		"city" : "Bangalore" ,
		"designation" : "" ,
		"diet" : "" ,
		"email" : "mf606931@gmail.com" ,
		"institution" : "wadwqd" ,
		"medical_council_number" : "aaaa" ,
		"membership_number" : "" ,
		"name" : "Mohammed Faisal" ,
		"phone" : "+919353676794" ,
		"pincode" : "560011" ,
		"salutation" : "Mr" ,
		"sex" : "Female" ,
		"state" : "Karnataka"
	}

while 1:
	try:
		res = requests.post(url+'/register', data=payload)
		print(res.json())
		if (res.json()["status"]) == "ok" :
			res2 = requests.delete(url+'/remove/entry/'+payload["email"], data=payload)
			print(res2.json())
		t.sleep(1800)
	except:
		print("Trying again")
	


