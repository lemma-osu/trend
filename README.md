trend
==========
trend is a web tool using D3 and Semantic UI for visualizing Gradient
Nearest Neighbor (GNN) trends over time.  GNN is a forest vegetation
mapping method based on ordination (canonical correspondence analysis) and
nearest-neighbor imputation.

We have run GNN models across Washington, Oregon and California from 1984
to 2012 (data avaialable online at http://lemma.forestry.oregonstate.edu/data).
Using these models and ancillary stratifying variables (such as
ownership, disturbance patterns, etc.), we create strata that include 
counts of pixels in a stratum and statistics from GNN continuous variables.
The trend tool allows a user to:
  
  1. select a continuous variable to graph
  2. select a categorical variable to represent multiple series
  3. define the time range
  4. narrow the focus area based on other categorical (e.g. stratifying)
     variables

We anticipate that the tool will most likely be used by forest managers for
assessing regional-scale trends, but the application should be adaptable to
include any categorical/continuous variables.

Inputs
------
trend relies on a JSON file to describe the data fields and point to a 
CSV file which holds the actual data.  Right now it is hard-coded to 
read from a file called 'trajectory.json', which should be a user input in
later iterations.  For now, we have not posted the data files as they are 
big and change often, but they are currently available here:

  * http://lemma.forestry.oregonstate.edu/sandbox/trajectory/trajectory.json
  * http://lemma.forestry.oregonstate.edu/sandbox/trajectory/trajectory.csv

Status
------
This is very much a research tool right now and apt to large changes.

Example
-------
We are currently hosting the example application at:

  * http://lemma.forestry.oregonstate.edu/sandbox/trajectory/index.html
