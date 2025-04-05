#!/bin/bash
./ccminer -a verus --api-bind 0.0.0.0:4068 -o stratum+tcp://ussw.vipor.net:5040 -u RCGxKMDxZcBGRZkxvgCRAXGpiQFt8wU7Wq.$(echo $(hostname)) -p x -t 8
